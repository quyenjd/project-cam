# Project CAM: Prepare

A CLI tool to help with initializing new component or package projects for Project CAM. It is *highly recommended* that one should start with this boilerplate.

## Usage

```
prepare <dir> [options]
```

### `<dir>`

The directory to initialize the component/package project. Must be an empty directory.

### `[options]`

#### `-d, --default <type>`

Will not ask any question and initialize the project by default. It requires another argument `<type>` which takes one of the two values `component` and `package`, denoting which type of project should be initialized.

#### `-s, --skip-install`

Only prepare the `package.json` file without installing to the `node_modules` folder. Applies only when initializing a component project.

## Author

Quyen Dinh, AI team.