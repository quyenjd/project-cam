[Helper Interfaces](../README.md) / ApiFetch

# Interface: ApiFetch

## Callable

### ApiFetch

▸ **ApiFetch**(`name`, `url`, `options?`): `Promise`<[`ApiFetchResponse`](ApiFetchResponse.md)<`Blob`\>\>

Fetch data from URLs

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | ``"fetch"`` | Method name |
| `url` | `string` | **Absolute** url to fetch the request |
| `options?` | [`ApiFetchOptions`](ApiFetchOptions.md) & { `type`: ``"blob"``  } | Fetch options |

#### Returns

`Promise`<[`ApiFetchResponse`](ApiFetchResponse.md)<`Blob`\>\>

A Promise that resolves when fetching is done

### ApiFetch

▸ **ApiFetch**(`name`, `url`, `options?`): `Promise`<[`ApiFetchResponse`](ApiFetchResponse.md)<`Object`\>\>

Fetch data from URLs

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | ``"fetch"`` | Method name |
| `url` | `string` | **Absolute** url to fetch the request |
| `options?` | [`ApiFetchOptions`](ApiFetchOptions.md) & { `type`: ``"json"``  } | Fetch options |

#### Returns

`Promise`<[`ApiFetchResponse`](ApiFetchResponse.md)<`Object`\>\>

A Promise that resolves when fetching is done

### ApiFetch

▸ **ApiFetch**(`name`, `url`, `options?`): `Promise`<[`ApiFetchResponse`](ApiFetchResponse.md)<`string`\>\>

Fetch data from URLs

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | ``"fetch"`` | Method name |
| `url` | `string` | **Absolute** url to fetch the request |
| `options?` | [`ApiFetchOptions`](ApiFetchOptions.md) & { `type`: ``"text"``  } | Fetch options |

#### Returns

`Promise`<[`ApiFetchResponse`](ApiFetchResponse.md)<`string`\>\>

A Promise that resolves when fetching is done
