[Helper Interfaces](../README.md) / EventNewInputListener

# Interface: EventNewInputListener

## Hierarchy

- `Listener`

  ↳ **`EventNewInputListener`**

## Callable

### EventNewInputListener

▸ **EventNewInputListener**(`input`): `Record`<`string`, `any`\> \| `Promise`<`Record`<`string`, `any`\>\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | `Record`<`string`, { `param`: `string` ; `value`: `any`  }[]\> | New input as an object where keys are the input parameters listed in the component JSON file |

#### Returns

`Record`<`string`, `any`\> \| `Promise`<`Record`<`string`, `any`\>\>

New output to merge with the current output of the component
