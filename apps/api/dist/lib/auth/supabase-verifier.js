"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseAuthVerifier = void 0;
const supabaseAdmin_1 = require("../supabaseAdmin");
class SupabaseAuthVerifier {
    async verifyToken(token) {
        const { data, error } = await supabaseAdmin_1.supabaseAdmin.auth.getUser(token);
        if (error || !data.user)
            return null;
        return { providerId: data.user.id, email: data.user.email ?? "" };
    }
}
exports.SupabaseAuthVerifier = SupabaseAuthVerifier;
//# sourceMappingURL=supabase-verifier.js.map