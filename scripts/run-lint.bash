#!/bin/bash
# run lint on a project

set -o pipefail

declare Pkg=run-lint-fix
declare Version=0.1.0

function msg() {
    echo "$Pkg: $*"
}

function err() {
    msg "$*" 1>&2
}

# usage: main "$@"
function main () {
    local arg ignore_lint
    for arg in "$@"; do
        case "$arg" in
            --ignore-lint | --ignore-lin | --ignore-li | --ignore-l)
                ignore_lint=1
                ;;
            -*)
                err "unknown option: $arg"
                return 2
                ;;
        esac
    done

    msg "running install"

    local install_status

    npm install
    install_status=$?
    if [[ ! $install_status -eq 0 ]]; then
        err "npm install errored"
        return 1
    fi

    msg "running lint"

    local lint_status
    $(npm bin)/tslint --fix '**/*.ts' --exclude 'node_modules/**' --exclude 'build/**' -t verbose
    lint_status=$?

    if [[ $lint_status -eq 0 ]]; then
        :
    elif [[ $lint_status -eq 2 ]]; then
        err "TypeScript failed to pass linting"
        if [[ $ignore_lint ]]; then
            err "ignoring linting failure"
        else
            return 1
        fi
    else
        err "tslint errored"
        return 1
    fi
}

main "$@" || exit 1
exit 0
