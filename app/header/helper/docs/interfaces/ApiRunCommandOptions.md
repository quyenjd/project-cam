[Helper Interfaces](../README.md) / ApiRunCommandOptions

# Interface: ApiRunCommandOptions

Configurations of `runcommand` commands

## Table of contents

### Properties

- [args](ApiRunCommandOptions.md#args)
- [cwd](ApiRunCommandOptions.md#cwd)
- [encoding](ApiRunCommandOptions.md#encoding)
- [timeout](ApiRunCommandOptions.md#timeout)
- [windowsHide](ApiRunCommandOptions.md#windowshide)

## Properties

### args

• `Optional` **args**: `string`[]

Arguments to be passed to the command (default to `[]`)

___

### cwd

• `Optional` **cwd**: `string`

Working directory of the command (default to the directory of the component)

___

### encoding

• `Optional` **encoding**: `string`

Encoding of the stdout and stderr streams (default to `utf8`)

___

### timeout

• `Optional` **timeout**: `number`

Timeout of the running process in milliseconds

___

### windowsHide

• `Optional` **windowsHide**: `boolean`

Hide subprocess console window in Windows (default to `false`)
