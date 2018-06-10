[![Build Status](https://travis-ci.org/netguru/ember-cli-deploy-rollbar-sourcemap.svg?branch=master)](https://travis-ci.org/netguru/ember-cli-deploy-rollbar-sourcemap)

# ember-cli-deploy-rollbar-sourcemap

> An ember-cli-deploy plugin that uploads your source maps to Rollbar.

This plugin uploads generated source maps to the Rollbar API. During upload of the source maps to Rollbar you must provide `source_code` string that will match the error raised in Rollbar with the same value. To do this, Rollbar snippet is injected into `index.html` after the revision data is generated with revision key as `source_code`. After all, the plugin uploads the source maps with the same revision key as injected into `index.html`.

[You can take a look here how Rollbar defines its flow with source maps][5]

This library was adapted from [@netguru](https://github.com/netguru)'s [ember-cli-deploy-rollbar](https://github.com/netguru/ember-cli-deploy-rollbar)
and [ember-cli-deploy-bugsnag](https://github.com/IcarusWorks/ember-cli-deploy-bugsnag).

## What is an ember-cli-deploy plugin?

A plugin is an addon that can be executed as a part of the ember-cli-deploy pipeline. A plugin will implement one or more of the ember-cli-deploy's pipeline hooks.

For more information on what plugins are and how they work, please refer to the [Plugin Documentation][1].

## Quick Start
To get up and running quickly, do the following:

- Ensure [ember-cli-deploy-build][2] is installed and configured
- Ensure [ember-cli-deploy-revision-data][4] is installed and configured

- Install this plugin

```bash
$ ember install ember-cli-deploy-rollbar-sourcemap
```

- Enable sourcemaps for all environments in `ember-cli-build.js`:

```js
/* jshint node:true */
/* global require, module */
var EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function(defaults) {
  var app = new EmberApp(defaults, {
    // …
    sourcemaps: {
      enabled: true, // This allows sourcemaps to be generated in all environments
      extensions: ['js']
    }
  });
```

- Run the pipeline

```bash
$ ember deploy
```

## Installation
Run the following command in your terminal:

```bash
ember install ember-cli-deploy-rollbar-sourcemap
```

## ember-cli-deploy Hooks Implemented

For detailed information on what plugin hooks are and how they work, please refer to the [Plugin Documentation][6].

- `willUpload` (inject Rollbar snippet)
- `upload` (upload source maps)
- `didDeploy` (send information about deploy to Rollbar)

## Configuration Options

For detailed information on how configuration of plugins works, please refer to the [Plugin Documentation][7].

Configure this addon in your `deploy.js` `ENV`:

```js
'rollbar-sourcemap': {
  accessServerToken: process.env.ROLLBAR_SERVER_ACCESS_TOKEN,
},
```

### accessServerToken (required)

Rollbar server access token to allow uploading source maps to your account.

### publicUrl (required)

The fully qualified domain name for your application e.g., `https://app.fancy-app.com`

### enabled

Defines internal `enabled` Rollbar config.

*Default:* `true`
*Alternatives:* `false`

### environment

Defines internal `environment` Rollbar config.

*Default:* environment setting from ember-cli-deploy-build || `production`
*Alternatives:* any other env

### captureUncaught

Defines internal `captureUncaught` Rollbar config.

*Default:* `true`
*Alternatives:* `false`

### username

Rollbar `local_username` config that is displayed in Deploys section.

*Default:* `unknown user`
*Alternatives:* any string or function returning string

### rollbarFileURI

Defines the URI to download the Rollbar JS file.

*Default:* `https://d37gvrvc0wt4s1.cloudfront.net/js/v1.8/rollbar.min.js`
*Alternatives:* any string that points to the file (e.g. https://mycdn.com/js/rollbar.min.js)

### additionalFiles

Defines additional sourcemap files to be uploaded to Rollbar. Use this if you build .js files other than `projectName.js` and `vendor.js`.

Set to an array of filenames excluding their extentions. For example in an app that builds `exta-functionality.js` and `additional-library.js` set to `['exta-functionality', 'additional-library']`.

*Default:* `[]`
*Alternatives:* an array of filenames without extensions

## Prerequisites

The following properties are expected to be present on the deployment `context` object:

- `distDir`      (provided by [ember-cli-deploy-build][2])
- `distFiles`    (provided by [ember-cli-deploy-build][2])
- `revisionData` (provided by [ember-cli-deploy-revision-data][4])

## Plugins known to work well with this one

* [ember-cli-deploy-redis](https://github.com/ember-cli-deploy/ember-cli-deploy-redis)
* [ember-cli-deploy-s3](https://github.com/ember-cli-deploy/ember-cli-deploy-s3)

## Known issues
* You must enable source maps in your `ember-cli-build.js` file, even in `production` env. However, you don't need to upload them anywhere (they won't be available online) - they are only needed during `upload` phase in deploy pipeline.
* If you are using gzipping, make sure that you are not gzipping source maps - Rollbar will not accept gzipped files.
* If you bump in any other issue in your deployment flow, give me a sign and I'll try to make this addon more flexible for you.

## Development

### Installation

* `git clone https://github.com/netguru/ember-cli-deploy-rollbar-sourcemap`
* `cd my-addon`
* `npm install`

### Linting

* `npm run lint:js`
* `npm run lint:js -- --fix`

### Running tests

* `ember test` – Runs the test suite on the current Ember version
* `ember test --server` – Runs the test suite in "watch mode"
* `ember try:each` – Runs the test suite against multiple Ember versions

### Running the dummy application

* `ember serve`
* Visit the dummy application at [http://localhost:4200](http://localhost:4200).

For more information on using ember-cli, visit [https://ember-cli.com/](https://ember-cli.com/).

License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).

[1]: http://ember-cli-deploy.com/docs/v0.6.x/ "Plugin Documentation"
[2]: https://github.com/ember-cli-deploy/ember-cli-deploy-build "ember-cli-deploy-build"
[3]: https://github.com/ember-cli/ember-cli-deploy "ember-cli-deploy"
[4]: https://github.com/ember-cli-deploy/ember-cli-deploy-revision-data "ember-cli-deploy-revision-data"
[5]: https://rollbar.com/docs/source-maps/ "Rollbar Documentation"
[6]: http://ember-cli-deploy.com/docs/v0.6.x/pipeline-hooks/ "Plugin Documentation"
[7]: http://ember-cli-deploy.com/docs/v0.6.x/configuration-overview/ "Plugin Documentation"
