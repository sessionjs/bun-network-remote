import type { Network } from "@session.js/types";
import { RequestType } from "@session.js/types/network/request";
import {
	SessionFetchError,
	SessionFetchErrorCode,
	SessionCryptoError,
	SessionRuntimeError,
	SessionValidationError,
	SessionJsError,
} from "@session.js/errors";

const ThrowableErrors = {
	[SessionFetchError.name]: SessionFetchError,
	[SessionCryptoError.name]: SessionCryptoError,
	[SessionRuntimeError.name]: SessionRuntimeError,
	[SessionValidationError.name]: SessionValidationError,
};

export class BunNetworkRemoteClient implements Network {
	proxy: string;

	constructor({ proxy }: { proxy: string }) {
		this.proxy = proxy;
	}

	async onRequest(type: RequestType, body: object): Promise<object> {
		const replacer = (_: unknown, value: unknown) => {
			if (value instanceof ArrayBuffer) {
				return Array.from(new Uint8Array(value));
			} else if (value instanceof Uint8Array) {
				return Array.from(value);
			} else {
				return value;
			}
		};
		let request: Response;
		try {
			request = await fetch(this.proxy, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ type, body }, replacer),
			});
		} catch (e) {
			throw new SessionFetchError({
				code: SessionFetchErrorCode.FetchFailed,
				message: `Fetch failed: ${e}`,
			});
		}
		if (request.status !== 200) {
			throw new SessionFetchError({
				code: SessionFetchErrorCode.InvalidResponse,
				message: `Invalid response status: ${request.status}`,
			});
		}
		try {
			if (request.headers.get("content-type") === "application/json") {
				const response = (await request.json()) as
					| { response: object }
					| { error: { instance: "SessionFetchError"; code: string; message: string } };
				if ("error" in response) {
					if (!(response.error.instance in ThrowableErrors)) {
						throw new SessionFetchError({
							code: SessionFetchErrorCode.InvalidResponse,
							message: `Invalid error in response: ${response.error}`,
						});
					} else {
						const ThrownError: typeof SessionJsError = ThrowableErrors[response.error.instance];
						throw new ThrownError({ code: response.error.code, message: response.error.message });
					}
				} else {
					return response.response;
				}
			} else {
				return new Uint8Array(await request.arrayBuffer());
			}
		} catch (e) {
			throw new SessionFetchError({
				code: SessionFetchErrorCode.InvalidResponse,
				message: `Invalid response body: ${e}`,
			});
		}
	}
}
