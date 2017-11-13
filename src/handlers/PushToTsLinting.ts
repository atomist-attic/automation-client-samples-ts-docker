import {
    EventFired,
    HandleEvent,
    HandlerContext,
    HandlerResult,
    Secrets,
    Success,
} from "@atomist/automation-client";
import { CommandResult, runCommand } from "@atomist/automation-client/action/cli/commandLine";
import {
    EventHandler,
    Secret,
} from "@atomist/automation-client/decorators";
import * as GraphQL from "@atomist/automation-client/graph/graphQL";
import { GitHubRepoRef } from "@atomist/automation-client/operations/common/GitHubRepoRef";
import { GitCommandGitProject } from "@atomist/automation-client/project/git/GitCommandGitProject";
import { GitProject } from "@atomist/automation-client/project/git/GitProject";
import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import * as appRoot from "app-root-path";
import axios from "axios";
import { exec } from "child-process-promise";
import * as _ from "lodash";
import * as graphql from "../typings/types";

@EventHandler("Runs ts tslint --fix on a given repository",
    GraphQL.subscriptionFromFile("graphql/subscription/pushToTsLinting"))
export class PushToTsLinting implements HandleEvent<graphql.PushToTsLinting.Subscription> {

    @Secret(Secrets.OrgToken)
    public githubToken: string;

    public handle(event: EventFired<graphql.PushToTsLinting.Subscription>,
                  ctx: HandlerContext): Promise<HandlerResult> {
        const push = event.data.Push[0];

        return GitCommandGitProject.cloned({ token: this.githubToken }, new GitHubRepoRef(push.repo.owner, push.repo.name, push.branch))
            .then(project => {

                // Verify that the tslint.json exists in the root of repo
                if (project.fileExistsSync("tslint.json")) {
                    const baseDir = project.baseDir;

                    // If it exists run our linting script
                    return runCommand(`bash ${appRoot}/scripts/run-lint.bash`, { cwd: baseDir })
                        .then(result => {
                            return this.commitAndPush(push, project, result, baseDir, ctx);
                        }).catch(result => {
                            return this.commitAndPush(push, project, result, baseDir, ctx);
                        });
                } else {
                    return Promise.reject("No 'tslint.json' found in project root");
                }
            })
            .then(() => Success)
            .catch(err => ({ code: 1, message: err.message }));
    }

    private commitAndPush(push: graphql.PushToTsLinting.Push, project: GitProject, result: CommandResult,
                          baseDir: string, ctx: HandlerContext): Promise<any> {
        return project.isClean().
            then(clean => {
                if (!clean.success) {
                    return project.createBranch(push.branch)
                        .then(() => project.commit(`Automatic de-linting\n[atomist:auto-delint]`))
                        .then(() => project.push())
                        .then(() => Success);
                } else {
                    return Promise.resolve(Success);
                }
            }).
            then(() => this.sendNotification(push, result, baseDir, ctx)).
            then(() => {
                return this.raiseGitHubStatus(push.repo.owner, push.repo.name, push.after.sha,
                    result.childProcess.exitCode);
            });
    }

    private sendNotification(push: graphql.PushToTsLinting.Push, result: any, baseDir: string,
                             ctx: HandlerContext): Promise<any> {
        if (result.childProcess.exitCode === 0 || !result.stdout) {
            return Promise.resolve();
        } else if (_.get(push, "after.author.person.chatId.screenName")) {
            const msg: SlackMessage = {
                text: `Linting failed after your push to \`${push.repo.owner}/${push.repo.name}\``,
                attachments: [{
                    color: "#D94649",
                    fallback: "Linting of TypeScript sources failed",
                    title: "Linting of TypeScript sources failed",
                    text: `\`\`\`${result.stdout.split(baseDir).join("")}\`\`\``,
                    mrkdwn_in: ["text"],
                    footer_icon: "http://images.atomist.com/rug/commit.png",
                    footer: `${push.repo.owner}/${push.repo.name}`,
                    ts: Math.floor(new Date().getTime() / 1000),
                }],
            };
            return ctx.messageClient.addressUsers(msg, push.after.author.person.chatId.screenName);
        }
    }

    private raiseGitHubStatus(owner: string, repo: string, sha: string, code: number): Promise<any> {
        return axios.post(`https://api.github.com/repos/${owner}/${repo}/statuses/${sha}`, {
            state: code === 0 ? "success" : "failure",
            context: "linting/atomist",
            description: `Linting of TypeScript sources ${code === 0 ? "was successful" : "failed"}`,
        }, {
                headers: {
                    Authorization: `token ${this.githubToken}`,
                },
            });
    }
}
