"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authVerifier = void 0;
const supabase_verifier_1 = require("./supabase-verifier");
// Single point where the active identity provider is chosen. To switch off
// Supabase, implement AuthVerifier (see supabase-verifier.ts for the shape)
// and swap the class instantiated here.
exports.authVerifier = new supabase_verifier_1.SupabaseAuthVerifier();
//# sourceMappingURL=index.js.map