const fs = require('fs');

function formatResponse(template, variables) {
    let result = template;
    for (const key in variables) {
        // use regex to replace all occurrences case-insensitively
        const re = new RegExp(`{${key}}`, 'gi');
        result = result.replace(re, variables[key] || '');
    }
    return result;
}

let unregisteredMsg = "Halo! Nomor Anda belum terdaftar. Silakan daftar di:\\n{link_web}";
unregisteredMsg = formatResponse(unregisteredMsg, {
    link_web: "https://ecosistemdigital.id/auth"
});
console.log(unregisteredMsg);
