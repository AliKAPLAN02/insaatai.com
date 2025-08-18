"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.push("/giris"); // login yoksa yönlendir
      } else {
        setUser(data.user);
      }
    };
    getUser();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-md text-center">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        {user ? (
          <p>Hoş geldin <span className="font-semibold">{user.email}</span> 🎉</p>
        ) : (
          <p>Yükleniyor...</p>
        )}
      </div>
    </div>
  );
}
