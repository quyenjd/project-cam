# Project CAM

Built in Electron, JavaScript, and SCSS, the application is a data-flow **component-based** automation/visualization tool that scales.

The main idea of the project is to provide an environment that is specialized for designing a pipeline of components, each of which has its own sets of input and output parameters, as well as its implementation of what I call a *processor* that is responsible for processing the input it receives and returning the output of whatever problem it is built to solve.

This application itself acts as a host that runs the components. It provides useful APIs for the components to call, transfers output of this component to other ones as their input, and has a **graph** to let users draw and visualize the flow of the components.

Adding, removing, and managing components are made easy with a dedicated package system. It allows users to freely install packages, which are sets of components. A [Helper](app/header/helper) utility has also been built to make the life of component developers easier. It is expected that all components should include this in order to communicate with the application.

And now, here comes more specific information...

## Development Notes

After cloning the project, run the following commands to get everything ready.

```
npm install
npm run submodules:build:prod
npm run build:prod
npm run start:prod
```

To run in development mode, which includes the DevTools inside the browser window, as well as an **F5** shortcut to reload the application, use `npm start` instead of `npm run start:prod`.

I use Electron Forge to run and build the project. Before building, make sure to read these [build notes](#build-notes) first. To create the final executable file of the application, use `npm run make:all`. Further information can be found [here](https://www.electronforge.io/).

[![js-semistandard-style](https://raw.githubusercontent.com/standard/semistandard/master/badge.svg)](https://github.com/standard/semistandard)

This project uses JavaScript Semi-Standard Style to standardize the source code. Make sure to use `npm run lint` to check the style of the JavaScript files.

Front-end implementation includes UI elements in [js/dashboard](js/dashboard), an initialization script [js/ready.js](js/ready.js), and extensions such as JQuery in [js/.ext](js/.ext). Styling of UI elements can be found in [css/components](css/components), as well as the file that includes all elements [css/dashboard.scss](css/dashboard.scss), and extensions in [css/.ext](css/.ext). All front-end source files should be compiled using `npm run build` (for debugging) or `npm run build:prod` (for production) before the application can use. Make sure to call these scripts before committing, packaging, or building/making.

Back-end implementation including the event collection, package system, logger, and other useful APIs can be found in [app](app).

I am using [JSDOC](https://jsdoc.app/) for **typing**! It would be hell if typing was not supported.

## Extensions

This project is component-based, so extending it should be easy. Building a component is just like building a Node web project, since components are loaded into [webviews](https://www.electronjs.org/docs/latest/api/webview-tag). But to deploy and have it ready to be used in the application, you need to create a `component.cam.json` file in the root directory of your project that conforms the [Component JSON Rules](#component-json-rules). Same applies to deploying a package, which you need a `package.cam.json` file that conforms the [Package JSON Rules](#package-json-rules).

More specifically, here is a full walk-through of creating a simple package that contains a simple component.

### Getting Started

To begin, let us create a new Node project.

```
npm init -y
```

Then, write some source files so our component has something to run.

#### index.js

```js
// Do a simple calculation
(function () {
  let sum = 0;
  for (let i = 1; i <= 1000; ++i) sum += i;
  return sum;
})()
```

#### index.html

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1" />
  <style>
    #message {
      color: red;
      font-weight: bold;
    }
  </style>
</head>

<body>
  <p>Hello, World!</p>
  <p>Status: <span id="message">Calculating...</span></p>

  <script>
    // The Helper utility will be added to window once the component is loaded
    window.Helper((event, api, destroy) => {
      // Load script file through the API
      api.call('readfile', 'index.js').then((fileContent) => {
        // Run the script to get the result
        const sum = eval(fileContent);

        // Push the result to the application
        api.call('newoutput', { sum }).then(() => {
          document.getElementById('message').textContent = 'Calculated! Result: ' + sum;
        });
      });
    });
  </script>
</body>

</html>
```

Finally, add the two files required by CAM and we're done for the day.

#### component.cam.json

```json
{
  "type": "component",
  "id": "project-cam-demo",
  "version": "1.0.0",
  "name": "Demo Component",
  "description": "This component is only for demonstration.",
  "output": [{
    "name": "sum"
  }],
  "category": "Demo",
  "files": "*",
  "indexFile": "index.html"
}
```

#### package.cam.json

```json
{
  "type": "package",
  "id": "project-cam-demo-pkg",
  "version": "1.0.0",
  "name": "Demo Package",
  "description": "This package is only for demonstration.",
  "includes": [{
    "cond": "com/project-cam-demo@>=1.0.0",
    "ref": "component.cam.json"
  }]
}
```

The above demonstration might not take advantage of Node and NPM, but it is always a good idea to have the project initialized so you can later install more packages easily and parcel them using [Webpack](https://webpack.js.org/) or any other bundler.

### APIs For Component Development

The full list of all supported events and methods can be found [here](app/header/helper/docs/README.md).

To re-export the documentation, use `npm run helperdoc`.

### Prepare CLI

To quickly start a component or package project, it is *highly recommended* that you use the [`prepare`](https://bitbucket.org/hidesignsJP/project-cam-prepare) CLI tool by calling `npm run cli:prepare` to initialize it for you. It comes with a decent template that saves you time.

### Component JSON Rules

A `component.cam.json` file must have the following keys (not necessarily all).

| Keys | Meaning | Type | Notes |
|---|---|---|---|
| type | JSON file type | `string` | This has to be *exactly* equal to `component`. |
| id | Component id/entity | `string` | Contain only letters, numbers, hyphens, underscores, dots, and ats. |
| version | Component version | `string` | Must be a valid [semantic version](https://semver.org/). |
| name | Component name | `string` |  |
| description | Component description | `string` |  |
| defaultHeight | Default (minimum) height of the component | `number` | Default to 200. |
| defaultWidth | Default (minimum) width of the component | `number` | Default to 200. |
| input | Input parameters | `{ limit?: number, name: string, required?: boolean, type?: string }[]` | Parameters are matched by **type**, except parameters of type `_` will match all other parameters. Parameters of name `_` will default to have the type of `_`. If `type` is not provided, the parameter will have the same type as its name. Also, one can control the number of connections to a parameter by specifying a limit (default is 0, which means no limit). |
| output | Output parameters | `{ name: string, type?: string }[]` |  |
| category | Component category | `string` | Default to `Uncategorized`. |
| minimized | Whether to start the component minimized | `boolean` | Default to `false`, which is **always** recommended. |
| files | List of files including in the component | `string[]` | Array of Glob patterns. |
| indexFile | Relative path to the HTML file that will be used when the component is loaded | `string` | This file should be included in the given `files`. |
| compatibleUntil | The **earliest** version of the component id/entity that this version is backward compatible with. | `string` | This will be used when loading projects/sessions to determine whether the saved component version(s) is still supported. Must be a valid [semantic version](https://semver.org/). If not provided, the component version will be used. |

### Package JSON Rules

A `package.cam.json` file must have the following keys (not necessarily all).

| Keys | Meaning | Type | Notes |
|---|---|---|---|
| type | JSON file type | `string` | This has to be *exactly* equal to `package`. |
| id | Package id/entity | `string` | Contain only letters, numbers, hyphens, underscores, dots, and ats. |
| version | Package version | `string` | Must be a valid [semantic version](https://semver.org/). |
| name | Package name | `string` |  |
| description | Package description | `string` |  |
| includes | What components the package includes | `(string \| { cond: string, ref: string })[]` | For every item, if a string is provided, it has to have the format of `<prefix>/<name>@<range>`. `<prefix>` can be `com` or `pkg`, indicating whether `<name>` is the name of a component or a package, respectively. `<name>` has the same requirements as the component/package id/entity. `<range>` must be a valid semantic version range. This will be used as a condition to check if a version of a component/package already exists in order to skip the installation. Useful when updating the package. Otherwise, if an object is provided, the `cond` property will have the same format as the string mentioned above. The `ref` property will be used to install a new component if the condition does not match, or if we are [forcing the package installation](#force-package-installation). `ref` points to a JSON or a compiled ZIP file of the component. |

### Force Package Installation

If forcing is enabled when installing a package, it will overwrite the package in the collection if they have the same version. Furthermore, it will default to use the components that come with the package by forcefully installing the ones specified with `ref`.

## Build Notes

On Linux (Ubuntu specifically), make sure to run this command to install the required libraries before building.

```
sudo apt install dpkg fakeroot rpm
```

## Platform

Tested on Windows 10 & 11, Ubuntu 20.04 LTS, and macOS Big Sur.

## Testing

Check it out in the [TESTING](TESTING.md) documentation.

## Author

Quyen Dinh, AI team.
