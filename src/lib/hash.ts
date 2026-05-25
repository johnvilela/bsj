const _computePepper = () => {
  const authSecret = process.env.AUTH_SECRET;

  if (!authSecret) {
    throw new Error("AUTH_SECRET required");
  }

  return new Bun.CryptoHasher("sha256").update(authSecret).digest();
};

const pepper = _computePepper();

const _peppered = (plainPassword: string) =>
  new Bun.CryptoHasher("sha256", pepper).update(plainPassword).digest("hex");

export const createHash = () => ({
  create: (plainPassword: string) =>
    Bun.password.hash(_peppered(plainPassword)),
  compare: (plainPassword: string, passwordHash: string) =>
    Bun.password.verify(_peppered(plainPassword), passwordHash),
});
