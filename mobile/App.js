import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { supabase } from './src/lib/supabase';
import { LogOut, MonitorX } from 'lucide-react-native';

// --- ECRANE ---
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen'; // Pentru Gestionar & Admin (Scanare)
import AgentDashboard from './src/screens/AgentDashboard';   // Pentru Agent (Comenzi)

const Stack = createNativeStackNavigator();

export default function App() {
    const [session, setSession] = useState(null);
    const [userRole, setUserRole] = useState(null); // 'admin', 'gestionar', 'agent', 'casier'
    const [loading, setLoading] = useState(true);

    // Funcție pentru a determina rolul utilizatorului
    const fetchUserRole = async (userId) => {
        try {
            // 1. Verificăm dacă e AGENT
            const { data: agent } = await supabase.from('agenti').select('id').eq('user_id', userId).single(); // Presupunând că ai legat user_id
            // SAU verificăm după email dacă nu ai user_id încă setat corect peste tot
            // const { data: agent } = await supabase.from('agenti').select('id').eq('email', session.user.email).single();

            if (agent) return 'agent';

            // 2. Verificăm tabela de angajați (dacă ai una) sau metadata
            // Aici e un exemplu generic. Adaptează query-ul la structura ta de Bază de Date!
            // Dacă rolurile sunt în tabela 'users_roles' sau în metadata userului:

            const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .single();

            if (roleData) return roleData.role;

            // 3. FALLBACK TEMPORAR (Pentru testare, dacă nu ai tabela user_roles încă)
            // Poți verifica manual email-ul adminului
            const { data: userData } = await supabase.auth.getUser();
            if (userData.user.email === 'admin@magazin.ro') return 'admin';

            // Implicit, dacă nu găsim rol, presupunem că e un user simplu sau eroare
            return 'unknown';

        } catch (error) {
            console.log('Eroare la preluarea rolului:', error);
            return null;
        }
    };

    useEffect(() => {
        // Verificăm sesiunea la pornire
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);

            if (session) {
                // Dacă e logat, aflăm cine este
                const role = await fetchUserRole(session.user.id);

                // Logică suplimentară pentru identificarea Agentului dacă fetchUserRole a dat fail pe ID
                // Verificăm dacă există în tabela agenti după email
                if (!role || role === 'unknown') {
                    const { data: agentByEmail } = await supabase.from('agenti').select('id').eq('email', session.user.email).single();
                    if (agentByEmail) {
                        setUserRole('agent');
                    } else {
                        // Pentru moment, considerăm Admin/Gestionar orice altceva (pentru testare)
                        // În producție trebuie să fii strict!
                        setUserRole('admin');
                    }
                } else {
                    setUserRole(role);
                }
            }
            setLoading(false);
        };

        checkSession();

        // Ascultăm schimbările (login/logout)
        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            if (session) {
                setLoading(true);
                // Recalculăm rolul la login
                const role = await fetchUserRole(session.user.id);
                if (!role || role === 'unknown') {
                    const { data: agentByEmail } = await supabase.from('agenti').select('id').eq('email', session.user.email).single();
                    if (agentByEmail) setUserRole('agent');
                    else setUserRole('admin');
                } else {
                    setUserRole(role);
                }
                setLoading(false);
            } else {
                setUserRole(null);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={{marginTop: 10, color: 'gray'}}>Se verifică permisiunile...</Text>
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>

                {!session ? (
                    // 1. NU E LOGAT -> Ecran Login
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : userRole === 'casier' ? (
                    // 2. ESTE CASIER -> Blocăm accesul
                    <Stack.Screen name="AccessDenied">
                        {() => (
                            <View style={styles.center}>
                                <MonitorX size={64} color="#ef4444" />
                                <Text style={styles.errorTitle}>Acces Interzis pe Mobil</Text>
                                <Text style={styles.errorText}>
                                    Rolul de "Casier" este disponibil doar pe PC.
                                    Te rugăm să te loghezi la casa de marcat.
                                </Text>
                                <Text style={styles.logoutBtn} onPress={() => supabase.auth.signOut()}>
                                    <LogOut size={16} color="blue" /> Deconectare
                                </Text>
                            </View>
                        )}
                    </Stack.Screen>
                ) : userRole === 'agent' ? (
                    // 3. ESTE AGENT -> Dashboard Agent
                    <Stack.Screen name="AgentDashboard" component={AgentDashboard} initialParams={{ userId: session.user.id }} />
                ) : (
                    // 4. ESTE ADMIN sau GESTIONAR -> Dashboard Scanare (Stocuri)
                    <Stack.Screen name="DashboardScreen" component={DashboardScreen} />
                )}

            </Stack.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6', padding: 20 },
    errorTitle: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginTop: 20 },
    errorText: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginTop: 10, marginBottom: 30 },
    logoutBtn: { color: '#2563eb', fontWeight: 'bold', marginTop: 20 }
});