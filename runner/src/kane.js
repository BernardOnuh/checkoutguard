// Kane CLI adapter. Kane's exact command syntax and output format get filled in from its own documentation
// (`kane --help`) once it's installed; nothing here guesses them. Until then CheckoutGuard uses the local
// stand-in check, and every run says which tester produced it.
export const kaneConfigured = () => Boolean(process.env.CG_KANE_CMD);

export async function runKane(scenario, baseUrl, evidenceDir) {
  throw new Error("Kane CLI isn't wired up yet: install it, sign in, and share `kane --help` so this adapter can use its real commands.");
}
