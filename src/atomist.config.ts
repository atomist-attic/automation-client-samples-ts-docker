import { Configuration } from "@atomist/automation-client/configuration";
import * as appRoot from "app-root-path";
import * as cfenv from "cfenv";
import { PushToTsLinting } from "./handlers/PushToTsLinting";

// tslint:disable-next-line:no-var-requires
const pj = require(`${appRoot}/package.json`);

const appEnv = cfenv.getAppEnv();
const credService = appEnv.getServiceCreds("github-token");
const dashboardService = appEnv.getServiceCreds("dashboard-credentials");

const token = credService ? credService.token : process.env.GITHUB_TOKEN;
const username = dashboardService ? dashboardService.user : undefined;
const password = dashboardService ? dashboardService.password : undefined;

const authEnabled = !appEnv.isLocal;

export const configuration: Configuration = {
    name: pj.name,
    version: pj.version,
    teamId: "T1L0VDKJP",
    events: [
        () => new PushToTsLinting(),
    ],
    token,
    http: {
        enabled: true,
        auth: {
            basic: {
                enabled: authEnabled,
                username,
                password,
            },
            bearer: {
                enabled: authEnabled,
            },
        },
    },
};
