[Helper Interfaces](../README.md) / ApiRunCommandInShellOptions

# Interface: ApiRunCommandInShellOptions

Configurations of `runcommandinshell` commands

## Table of contents

### Properties

- [cwd](ApiRunCommandInShellOptions.md#cwd)
- [encoding](ApiRunCommandInShellOptions.md#encoding)
- [maxBuffer](ApiRunCommandInShellOptions.md#maxbuffer)
- [timeout](ApiRunCommandInShellOptions.md#timeout)
- [windowsHide](ApiRunCommandInShellOptions.md#windowshide)

## Properties

### cwd

• `Optional` **cwd**: `string`

Working directory of the command (default to the directory of the component)

___

### encoding

• `Optional` **encoding**: `string`

Encoding of the stdout and stderr streams (default to `utf8`)

___

### maxBuffer

• `Optional` **maxBuffer**: `number`

Maximum amount of data (in bytes) allowed on stdout and stderr (default to `1048576`)

___

### timeout

• `Optional` **timeout**: `number`

Timeout of the running process in milliseconds

___

### windowsHide

• `Optional` **windowsHide**: `boolean`

Hide subprocess console window in Windows (default to `false`)
