[Helper Interfaces](../README.md) / ApiRunFileOptions

# Interface: ApiRunFileOptions

Configurations of `runfile` commands

## Table of contents

### Properties

- [args](ApiRunFileOptions.md#args)
- [cwd](ApiRunFileOptions.md#cwd)
- [encoding](ApiRunFileOptions.md#encoding)
- [timeout](ApiRunFileOptions.md#timeout)

## Properties

### args

• `Optional` **args**: `string`[]

Arguments to be passed to the file (default to `[]`)

___

### cwd

• `Optional` **cwd**: `string`

Working directory of the file (default to the directory of the component)

___

### encoding

• `Optional` **encoding**: `string`

Encoding of the stdout and stderr streams (default to `utf8`)

___

### timeout

• `Optional` **timeout**: `number`

Timeout of the running process in milliseconds
