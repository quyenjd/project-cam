[Helper Interfaces](../README.md) / ApiFetchResponse

# Interface: ApiFetchResponse<ResponseType\>

Object to store the response from `fetch` commands

## Type parameters

| Name |
| :------ |
| `ResponseType` |

## Table of contents

### Properties

- [body](ApiFetchResponse.md#body)
- [headers](ApiFetchResponse.md#headers)
- [status](ApiFetchResponse.md#status)
- [statusText](ApiFetchResponse.md#statustext)
- [url](ApiFetchResponse.md#url)

## Properties

### body

• **body**: `ResponseType`

Response body, might be a string, a Blob, or a parsed JSON object

___

### headers

• **headers**: `Record`<`string`, `string`\>

Response headers

___

### status

• **status**: `number`

Response status

___

### statusText

• **statusText**: `string`

Response status text

___

### url

• **url**: `string`

URL that was used to fetch the response to
