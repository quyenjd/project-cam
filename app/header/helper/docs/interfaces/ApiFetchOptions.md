[Helper Interfaces](../README.md) / ApiFetchOptions

# Interface: ApiFetchOptions

Configurations of `fetch` commands

## Table of contents

### Properties

- [body](ApiFetchOptions.md#body)
- [headers](ApiFetchOptions.md#headers)
- [method](ApiFetchOptions.md#method)
- [password](ApiFetchOptions.md#password)
- [size](ApiFetchOptions.md#size)
- [timeout](ApiFetchOptions.md#timeout)
- [type](ApiFetchOptions.md#type)
- [user](ApiFetchOptions.md#user)

## Properties

### body

• `Optional` **body**: ``null`` \| `string` \| `Blob`

Request body (default to `null`)

___

### headers

• `Optional` **headers**: `Record`<`string`, `string`\>

Request headers

___

### method

• `Optional` **method**: `string`

Fetch request method (default to `GET`)

___

### password

• `Optional` **password**: `string`

When running on Electron behind an authenticated HTTP proxy, provide password to authenticate

___

### size

• `Optional` **size**: `number`

Maximum size of response body, 0 (default) to disable

___

### timeout

• `Optional` **timeout**: `number`

Maximum waiting time in ms, 0 (default) to disable

___

### type

• `Optional` **type**: ``"blob"`` \| ``"json"`` \| ``"text"``

Response type (default to `text`)

___

### user

• `Optional` **user**: `string`

When running on Electron behind an authenticated HTTP proxy, provide username to authenticate
