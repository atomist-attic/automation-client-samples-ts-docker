import { Configuration } from "@atomist/automation-client/configuration";
import * as appRoot from "app-root-path";
import { PushToTsLinting } from "./handlers/PushToTsLinting";

// tslint:disable-next-line:no-var-requires
const pj = require(`${appRoot}/package.json`);

const token = process.env.GITHUB_TOKEN;
const teamId = process.env.TEAM_ID;

export const configuration: Configuration = {
    name: pj.name,
    version: pj.version,
    teamId,
    events: [
        () => new PushToTsLinting(),
    ],
    token,
    http: {
        enabled: true,
        auth: {
            basic: {
                enabled: false,
            },
            bearer: {
                enabled: false,
            },
        },
    },
};
