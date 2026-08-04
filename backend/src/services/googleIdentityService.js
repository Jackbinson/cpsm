import axios from "axios";
import jwt from "jsonwebtoken";

const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v1/certs";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

let certificateCache = { certificates: null, expiresAt: 0 };

export class GoogleIdentityError extends Error {}

const cacheLifetime = (cacheControl) => {
  const seconds = /max-age=(\d+)/i.exec(cacheControl || "")?.[1];
  return Number(seconds || 300) * 1000;
};

async function getGoogleCertificates(forceRefresh = false) {
  if (!forceRefresh && certificateCache.certificates && certificateCache.expiresAt > Date.now()) {
    return certificateCache.certificates;
  }

  try {
    const response = await axios.get(GOOGLE_CERTS_URL, { timeout: 5000 });
    certificateCache = {
      certificates: response.data,
      expiresAt: Date.now() + cacheLifetime(response.headers["cache-control"]),
    };
    return certificateCache.certificates;
  } catch {
    throw new GoogleIdentityError("Could not load Google signing certificates.");
  }
}

/** Verifies the Google ID token signature and required OIDC claims on the API. */
export async function verifyGoogleIdToken(idToken) {
  if (typeof idToken !== "string" || !idToken) {
    throw new GoogleIdentityError("Google ID token is required.");
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new GoogleIdentityError("Google OAuth is not configured on the API.");
  }

  const decoded = jwt.decode(idToken, { complete: true });
  const keyId = decoded?.header?.kid;
  if (!keyId || decoded.header.alg !== "RS256") {
    throw new GoogleIdentityError("Google ID token has an invalid signing header.");
  }

  let certificates = await getGoogleCertificates();
  if (!certificates[keyId]) certificates = await getGoogleCertificates(true);
  const certificate = certificates[keyId];
  if (!certificate) {
    throw new GoogleIdentityError("Google signing key is not available.");
  }

  try {
    const claims = jwt.verify(idToken, certificate, {
      algorithms: ["RS256"],
      audience: clientId,
      issuer: GOOGLE_ISSUERS,
    });

    if (!claims.sub || !claims.email || claims.email_verified !== true) {
      throw new GoogleIdentityError("Google account must have a verified email address.");
    }

    return {
      subject: claims.sub,
      email: String(claims.email).toLowerCase(),
      name: typeof claims.name === "string" ? claims.name : String(claims.email),
      picture: typeof claims.picture === "string" ? claims.picture : "",
    };
  } catch (error) {
    if (error instanceof GoogleIdentityError) throw error;
    throw new GoogleIdentityError("Google ID token is invalid or expired.");
  }
}