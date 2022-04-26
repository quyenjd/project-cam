[Helper Interfaces](../README.md) / EventWillRemoveListener

# Interface: EventWillRemoveListener

## Hierarchy

- `Listener`

  ↳ **`EventWillRemoveListener`**

## Callable

### EventWillRemoveListener

▸ **EventWillRemoveListener**(`force`): `boolean` \| `Promise`<`boolean`\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `force` | `boolean` | true if the application forces removing the component, false otherwise |

#### Returns

`boolean` \| `Promise`<`boolean`\>

Return `false` to prevent it from being removed
