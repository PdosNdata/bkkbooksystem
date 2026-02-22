import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

// ดึงข้อมูลเพิ่มเติมจากตาราง users (homeroom_subjects, homeroom_grade, homeroom_room)
const fetchUserProfile = async (userId) => {
  try {
    const { data } = await supabase
      .from('users')
      .select('homeroom_subjects, homeroom_grade, homeroom_room')
      .eq('id', userId)
      .single();
    return data || {};
  } catch {
    return {};
  }
};

export const AuthProvider = ({ children }) => {
  // const [user, setUser] = useState({
  //   id: 1,
  //   name: 'ผู้ดูแลระบบ',
  //   role: 'admin'
  // });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // ตรวจสอบ localStorage ก่อน
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        setUser(JSON.parse(savedUser));
      }

      // ตรวจสอบ session จาก Supabase (สำหรับ Google OAuth callback)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const u = session.user;
        const profile = await fetchUserProfile(u.id);
        const userData = {
          id: u.id,
          email: u.email,
          name: u.user_metadata?.full_name || u.user_metadata?.name || u.email,
          role: u.user_metadata?.role || 'teacher',
          avatar: u.user_metadata?.avatar_url || null,
          homeroom_subjects: profile.homeroom_subjects || null,
          homeroom_grade: profile.homeroom_grade || null,
          homeroom_room: profile.homeroom_room || null,
        };
        localStorage.setItem('token', session.access_token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      localStorage.clear();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password, selectedRole = null, remember = false) => {
    try {
      // เข้าสู่ระบบผ่าน Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: username,
        password: password,
      });

      if (authError) {
        throw authError;
      }

      const userRole = authData.user.user_metadata?.role || 'teacher';

      // ตรวจสอบว่า role ที่เลือกตรงกับ role จริงของผู้ใช้
      if (selectedRole && selectedRole !== userRole) {
        // ออกจากระบบทันทีเพราะ role ไม่ตรง
        await supabase.auth.signOut();
        const roleLabel = selectedRole === 'admin' ? 'แอดมิน' : 'ครู';
        throw new Error(`บัญชีนี้ไม่ใช่ตำแหน่ง${roleLabel} กรุณาเลือกตำแหน่งให้ถูกต้อง`);
      }

      // upsert ลงตาราง users เผื่อยังไม่มี
      await supabase.from('users').upsert({
        id: authData.user.id,
        email: authData.user.email,
        full_name: authData.user.user_metadata?.full_name || authData.user.email,
        role: userRole,
        is_active: true,
      }, { onConflict: 'id' });

      // ดึงข้อมูลเพิ่มเติมจากตาราง users
      const profile = await fetchUserProfile(authData.user.id);
      const userData = {
        id: authData.user.id,
        email: authData.user.email,
        name: authData.user.user_metadata?.full_name || authData.user.email,
        role: userRole,
        homeroom_subjects: profile.homeroom_subjects || null,
        homeroom_grade: profile.homeroom_grade || null,
        homeroom_room: profile.homeroom_room || null,
      };

      // บันทึก token และ user data
      localStorage.setItem('token', authData.session.access_token);
      localStorage.setItem('user', JSON.stringify(userData));

      // จดจำการเข้าสู่ระบบ
      if (remember) {
        localStorage.setItem('rememberedEmail', username);
        localStorage.setItem('rememberedRole', selectedRole || userRole);
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedRole');
      }

      setUser(userData);

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน';

      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ';
      }

      return { success: false, message: errorMessage };
    }
  };

  const register = async (email, password, fullName, role = 'teacher') => {
    try {
      // สมัครสมาชิกผ่าน Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          }
        }
      });

      if (authError) {
        throw authError;
      }

      // บันทึกข้อมูลลงตาราง users
      if (authData.user) {
        await supabase
          .from('users')
          .upsert({
            id: authData.user.id,
            email: email,
            full_name: fullName,
            role: role,
            is_active: true,
          }, { onConflict: 'id' });
      }

      return {
        success: true,
        message: 'สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี',
        user: authData.user
      };
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่';

      if (error.message?.includes('already registered') || error.message?.includes('already been registered')) {
        errorMessage = 'อีเมลนี้ถูกใช้งานแล้ว';
      } else if (error.message?.includes('invalid email') || error.message?.includes('Invalid email')) {
        errorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
      } else if (error.message?.includes('password') || error.message?.includes('Password')) {
        errorMessage = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
      } else if (error.message?.includes('Email signups are disabled')) {
        errorMessage = 'ระบบยังไม่เปิดให้สมัครสมาชิกด้วยอีเมล กรุณาติดต่อผู้ดูแลระบบ';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return { success: false, message: errorMessage };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
        },
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Google login error:', error);
      return { success: false, message: 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ' };
    }
  };

  // ตรวจสอบ session จาก OAuth callback (Google)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const u = session.user;
        const profile = await fetchUserProfile(u.id);
        const userData = {
          id: u.id,
          email: u.email,
          name: u.user_metadata?.full_name || u.user_metadata?.name || u.email,
          role: u.user_metadata?.role || 'teacher',
          avatar: u.user_metadata?.avatar_url || null,
          homeroom_subjects: profile.homeroom_subjects || null,
          homeroom_grade: profile.homeroom_grade || null,
          homeroom_room: profile.homeroom_room || null,
        };
        localStorage.setItem('token', session.access_token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    setUser,
    login,
    loginWithGoogle,
    register,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};