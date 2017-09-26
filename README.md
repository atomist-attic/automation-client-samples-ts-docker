# @atomist/automation-client-samples-ts-docker

[Node][node] module containing samples demonstrating wrapping shell scripts 
by Atomist handlers and package it up in a Docker iamge.

Please visit [automation-client][automation-client] for more information about 
writing custom handlers.

[node]: https://nodejs.org/en/
[automation-client]: https://www.npmjs.com/package/@atomist/automation-client

# Getting Started

## Prerequisites

### Node.js

Please install Node.js from https://nodejs.org/en/download/ .

To verify that the right versions are installed, please run:

```
$ node -v
v8.4.0
$ npm -v
5.4.1
```

## Setting up the Project

To get started run the following commands:

```
$ git clone git@github.com:atomist/automation-client-samples-ts-docker.git
$ cd automation-client-samples-ts-docker
$ npm install
```

## Building the Docker Image

Run the following commnd to create the docker image:

```
$ cd automation-client-samples-ts-docker
$ npm run docker:build
```

## Running the Docker Image

To start up the Docker image, please run the following command:

```
$ docker run -it --rm -p 2866:2866 -e GITHUB_TOKEN=<your_token> \ 
    -e TEAM_ID=<your_team_id> automation-client-samples-ts-docker
```

Please make sure to replace `<your_token>` with a valid GitHub personal 
access token with `read:org` scope and `<your_team_id>` with the team id
of your Slack team (run `@atomist pwd` to get the team id).

## Support

General support questions should be discussed in the `#support`
channel on our community Slack team
at [atomist-community.slack.com][slack].

If you find a problem, please create an [issue][].

[issue]: https://github.com/atomist/automation-client-ts/issues

## Development

You will need to install [node][] to build and test this project.

### Build and Test

Command | Reason
------- | ------
`npm install` | to install all the required packages
`npm run lint` | to run tslint against the TypeScript
`npm run lint-fix` | to run tslint against the TypeScript with `--fix` option
`npm run compile` | to compile all TypeScript into JavaScript
`npm test` | to run tests and ensure everything is working
`npm run autotest` | run tests continuously (you may also need to run `tsc -w`)
`npm run clean` | remove stray compiled JavaScript files and build directory
`npm run docker:build` | run a compile and docker build
`npm start` | start up the automation client

### Release

To create a new release of the project, simply push a tag of the form
`M.N.P` where `M`, `N`, and `P` are integers that form the next
appropriate [semantic version][semver] for release.  The version in
the package.json is replaced by the build and is totally ignored!  For
example:

[semver]: http://semver.org

```
$ git tag -a 1.2.3
$ git push --tags
```

The Travis CI build (see badge at the top of this page) will publish
the NPM module and automatically create a GitHub release using the tag
name for the release and the comment provided on the annotated tag as
the contents of the release notes.

---
Created by [Atomist][atomist].
Need Help?  [Join our Slack team][slack].

[atomist]: https://www.atomist.com/
[slack]: https://join.atomist.com

