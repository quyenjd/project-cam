[Helper Interfaces](../README.md) / EventRestoreListener

# Interface: EventRestoreListener

## Hierarchy

- `Listener`

  ↳ **`EventRestoreListener`**

## Callable

### EventRestoreListener

▸ **EventRestoreListener**(`data`): `boolean` \| `Promise`<`boolean`\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `data` | `Record`<`string`, `any`\> | Backup data of the component that was saved before |

#### Returns

`boolean` \| `Promise`<`boolean`\>

true if the restoration succeeds, false otherwise
