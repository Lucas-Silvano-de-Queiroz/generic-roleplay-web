export default function Register() {
  async function handleRegister(formData: FormData) {
    "use server";

    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");

    const response = await fetch(
      "https://generic-roleplay-api.vercel.app/users",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Erro ao cadastrar usuário");
    }

  }

  return (
    <form action={handleRegister}>
      <input
        type="text"
        name="name"
        placeholder="Nome"
        required
      />

      <input
        type="email"
        name="email"
        placeholder="Email"
        required
      />

      <input
        type="password"
        name="password"
        placeholder="Senha"
        required
      />

      <button type="submit">
        Cadastrar
      </button>
    </form>
  );
}