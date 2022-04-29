[Helper Interfaces](../README.md) / ApiComponentGetAllParams

# Interface: ApiComponentGetAllParams

## Callable

### ApiComponentGetAllParams

▸ **ApiComponentGetAllParams**(`name`): `Promise`<{ `limit`: `number` ; `paramType`: ``"input"`` ; `required`: `boolean`  } & { `name`: `string` ; `type`: `string`  } & { `paramType`: ``"output"``  } & { `name`: `string` ; `type`: `string`  }[]\>

Get all input and output parameters of the component

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | ``"componentgetallparams"`` | Method name |

#### Returns

`Promise`<{ `limit`: `number` ; `paramType`: ``"input"`` ; `required`: `boolean`  } & { `name`: `string` ; `type`: `string`  } & { `paramType`: ``"output"``  } & { `name`: `string` ; `type`: `string`  }[]\>

A Promise that resolves to an array of input and output parameters
