import {
    EventHandler,
    Secret,
} from "@atomist/automation-client/decorators";
import {
    HandlerContext,
    HandlerResult,
    Secrets,
    Success,
    EventFired,
    HandleEvent,
} from "@atomist/automation-client/Handlers";
import { exec } from "child-process-promise";
import { GitCommandGitProject } from "@atomist/automation-client/project/git/GitCommandGitProject";
import * as GraphQL from "@atomist/automation-client/graph/graphQL";
import * as graphql from "../typings/types";
import axios from "axios";
import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import * as _ from "lodash";

@EventHandler("Runs ts tslint --fix on a given repository",
    GraphQL.subscriptionFromFile("graphql/subscription/pushToTsLinting"))
export class PushToTsLinting implements HandleEvent<graphql.PushToTsLinting.Subscription> {

    @Secret(Secrets.ORG_TOKEN)
    public githubToken: string;

    public handle(event: EventFired<graphql.PushToTsLinting.Subscription>, ctx: HandlerContext): Promise<HandlerResult> {
        const push = event.data.Push[0];

        return GitCommandGitProject.cloned(this.githubToken, push.repo.owner, push.repo.name, push.branch)
            .then(project => {

                // Verify that the tslint.json exists in the root of repo
                if (project.fileExistsSync("tslint.json")) {
                    const baseDir = project.baseDir;

                    // If it exists run npm install
                    return exec("npm install", { cwd: baseDir })
                            .then(() => {
                                return exec("npm run lint", { cwd: baseDir });
                            })
                            .then(result => {
                                return this.raiseGitHubStatus(push.repo.owner, push.repo.name, push.after.sha,
                                    result.childProcess.exitCode === 0 ? "success" : "failure");
                            }).catch( result => {
                                // This is where we are going to send a DM to the pusher
                                return this.sentNotifaction(push, result, baseDir, ctx)
                                    .then(() => {
                                        // Raise GitHub status
                                        return this.raiseGitHubStatus(push.repo.owner, push.repo.name, push.after.sha,
                                            result.childProcess.exitCode === 0 ? "success" : "failure");
                                    })
                                    .then(() => {
                                        return exec("npm run lint-fix", { cwd: baseDir })
                                    })
                                    // Commit and push all modifications
                                    .then(() => {
                                        return project.createBranch(push.branch);
                                    })
                                    .then(() => {
                                        return project.commit(`Automatic de-linting\n[atomist:auto-delint]`);
                                    })
                                    .then(() => {
                                        return project.push();
                                    });
                            });
                } else {
                    return Promise.reject("No 'tslint.json' found in project root");
                }
            })
            .then(() => {
                return Success;
            })
            .catch(err => {
                return { code: 1, message: err.message };
            });
    }

    private sentNotifaction(push: graphql.PushToTsLinting.Push, result: any, baseDir: string, ctx: HandlerContext): Promise<any> {
        if (result.childProcess.exitCode === 0) {
            return Promise.resolve();
        } else if (_.get(push, "after.author.person.chatId.screenName")){
            const msg: SlackMessage = {
                text: `Linting failed after your push to \`${push.repo.owner}/${push.repo.name}\``,
                attachments: [{
                    color: "#D94649",
                    fallback: "Linting of TypeScript sources failed",
                    title: "Linting of TypeScript sources failed",
                    text: `\`\`\`${result.stdout.split(baseDir).join("")}\`\`\``,
                    mrkdwn_in: [ "text" ],
                    footer_icon: "http://images.atomist.com/rug/commit.png",
                    footer: `${push.repo.owner}/${push.repo.name}`,
                    ts:  Math.floor(new Date().getTime() / 1000),
                }]
            }
            return ctx.messageClient.addressUsers(msg, push.after.author.person.chatId.screenName);
        }
    }

    private raiseGitHubStatus(owner: string, repo: string, sha: string, state: string): Promise<any> {
        return axios.post(`https://api.github.com/repos/${owner}/${repo}/statuses/${sha}`, {
                state,
                context: "linting/atomist",
                description: `Linting of TypeSript sources ${state === "success" ? "was successful" : "failed"}`,
            }, {
                headers: {
                    Authorization: `token ${this.githubToken}`,
                },
            });
    }
}
