import { SESSION_TOKEN } from "../constants";
import { getValidAccessToken } from "./auth";

// Headers for cart requests: the browser's session key, plus the customer's
// login when signed in, so a signed-in customer gets the same cart on every
// device. The token is refreshed first if it has expired.
export const cartConfig = async () => {
  await getValidAccessToken();
  return { headers: SESSION_TOKEN.headers };
};
