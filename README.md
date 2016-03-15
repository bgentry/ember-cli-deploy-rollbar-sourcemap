[![Build Status](https://travis-ci.org/netguru/ember-cli-deploy-rollbar.svg?branch=master)](https://travis-ci.org/netguru/ember-cli-deploy-rollbar)

# ember-cli-deploy-rollbar

> An ember-cli-deploy plugin that first __integrates Rollbar to your application__ and second __uploads your source maps to Rollbar__.

This plugin will integrate Rollbar into your `index.html` file and uploads generated source maps via Rollbar API. During upload of the source maps to Rollbar you must provide `source_code` string that will match the error raised in Rollbar with the same value. To do this, Rollbar snippet is injected into `index.html` after the revision data is generated with revision key as `source_code`. After all, the plugin uploads the source maps with the same revision key as injected into `index.html`.

[You can take a look here how Rollbar defines its flow with source maps][5]

## What is an ember-cli-deploy plugin?

A plugin is an addon that can be executed as a part of the ember-cli-deploy pipeline. A plugin will implement one or more of the ember-cli-deploy's pipeline hooks.

For more information on what plugins are and how they work, please refer to the [Plugin Documentation][1].

## Quick Start
To get up and running quickly, do the following:

- Ensure [ember-cli-deploy-build][2] is installed and configured
- Ensure [ember-cli-deploy-revision-data][4] is installed and configured

- Install this plugin

```bash
$ ember install ember-cli-deploy-rollbar
```

- Run the pipeline

```bash
$ ember deploy
```

## Installation
Run the following command in your terminal:

```bash
ember install ember-cli-deploy-rollbar
```

## ember-cli-deploy Hooks Implemented

For detailed information on what plugin hooks are and how they work, please refer to the [Plugin Documentation][1].

- `willUpload` (inject Rollbar snippet)
- `upload` (upload source maps)

## Configuration Options

For detailed information on how configuration of plugins works, please refer to the [Plugin Documentation][1].

### accessToken (required)

Rollbar client access token to trigger errors.

### accessServerToken (required)

Rollbar server access token to allow uploading source maps to your account.

### minifiedPrependUrl (required)

Rollbar demands to upload both source map and URL to minified file. This config let's you define the prepend to URL your assets will be available after upload. E.g. if you are using `ember-cli-deploy-s3`, add the same string as in `fingerprint/prepend` option in your `ember-cli-deploy` file.

### enabled

Defines internal `enabled` Rollbar config.

*Default:* `true`
*Alternatives:* `false`

### environment

Defines internal `environment` Rollbar config.

*Default:* `production`
*Alternatives:* any other env

### captureUncaught

Defines internal `captureUncaught` Rollbar config.

*Default:* `true`
*Alternatives:* `false`

## Prerequisites

The following properties are expected to be present on the deployment `context` object:

- `distDir`      (provided by [ember-cli-deploy-build][2])
- `distFiles`    (provided by [ember-cli-deploy-build][2])
- `revisionData` (provided by [ember-cli-deploy-revision-data][4])

## Plugins known to work well with this one

* [ember-cli-deploy-redis](https://github.com/ember-cli-deploy/ember-cli-deploy-redis)
* [ember-cli-deploy-s3](https://github.com/ember-cli-deploy/ember-cli-deploy-s3)

## Known issues
* You must enable source maps in your `ember-cli-deploy` file, even in `production` env. However, you don't need to upload them anywhere (they won't be available online) - they are only needed during `upload` phase in deploy pipeline.
* If you are using gzipping, make sure that you are not gzipping source maps - Rollbar will not accept gzipped files.
* If you bump in any other issue in your deployment flow, give me a sign and I'll try to make this addon more flexible for you.

[1]: http://ember-cli.github.io/ember-cli-deploy/plugins "Plugin Documentation"
[2]: https://github.com/ember-cli-deploy/ember-cli-deploy-build "ember-cli-deploy-build"
[3]: https://github.com/ember-cli/ember-cli-deploy "ember-cli-deploy"
[4]: https://github.com/ember-cli-deploy/ember-cli-deploy-revision-data "ember-cli-deploy-revision-data"
[5]: https://rollbar.com/docs/source-maps/ "Rollbar Documentation"
