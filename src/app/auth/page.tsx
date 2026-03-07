import { RegistrationFlow } from "@/components/auth/RegistrationFlow";

export const metadata = {
    title: 'Daftar Pahlawan Lingkungan',
    description: 'Bergabunglah dalam gerakan pengelolaan sampah cerdas untuk lingkungan bersih dan sehat.',
};

export default function AuthPage() {
    return <RegistrationFlow />;
}
