import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2 text-center">管理者ログイン</h1>
        <p className="text-gray-500 text-sm text-center mb-8">MCバトルRating 管理画面</p>
        <LoginForm />
      </div>
    </div>
  );
}
