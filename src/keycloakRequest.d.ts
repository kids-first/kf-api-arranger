// Declaration merge: keycloak-connect attaches `req.kauth` at runtime but
// doesn't extend Express's `Request` type. Without this file, TS rejects
// `req.kauth?.grant?...` and the only way to read it is bracket notation
// (`req['kauth']`), which trips biome's useLiteralKeys rule.
//
// Shape mirrors what keycloak-connect's grant manager populates on the
// request — only the fields we read are typed; the rest stays opaque.

import 'express';

declare module 'express-serve-static-core' {
    interface Request {
        kauth?: {
            grant?: {
                access_token?: {
                    content?: {
                        sub?: string;
                    };
                };
            };
        };
    }
}
