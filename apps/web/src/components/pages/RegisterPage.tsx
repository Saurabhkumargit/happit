import RegisterForm from "../auth/RegisterForm";

function RegisterPage() {
  function handleSuccess() {
    // Auth state/navigation will be handled here shortly.
  }

  return (
    <main>
      <RegisterForm onSuccess={handleSuccess} />
    </main>
  );
}

export default RegisterPage;