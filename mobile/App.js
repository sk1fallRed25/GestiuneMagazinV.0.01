import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from './src/lib/supabase';
import { LogOut, MonitorX } from 'lucide-react-native';

// --- ECRANE ---
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AgentDashboard from './src/screens/AgentDashboard';
import AddProductScreen from './src/screens/AddProductScreen'; // <-- IMPORT NOU

const Stack = createNativeStackNavigator();

export default function App() {
    const [session, setSession] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    // Funcție Roluri
    const fetchUserRole = async (userId) => {
        try {
            // 1. Verificăm tabela de roluri (SQL Trigger-ul făcut anterior)
            const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .single();

            if (roleData) return roleData.role;

            // 2. Fallback
            const { data: userData } = await supabase.auth.getUser();
            if (userData.user.email === 'admin@magazin.ro') return 'admin';

            return 'unknown';
        } catch (error) {
            return null;
        }
    };

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);

            if (session) {
                const role = await fetchUserRole(session.user.id);

                if (!role || role === 'unknown') {
                    const { data: agentByEmail } = await supabase.from('agenti').select('id').eq('email', session.user.email).single();
                    if (agentByEmail) setUserRole('agent');
                    else setUserRole('admin');
                } else {
                    setUserRole(role);
                }
            }
            setLoading(false);
        };

        checkSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            if (session) {
                setLoading(true);
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
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>

                {!session ? (
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : userRole === 'casier' ? (
                    <Stack.Screen name="AccessDenied">
                        {() => (
                            <View style={styles.center}>
                                <MonitorX size={64} color="#ef4444" />
                                <Text style={styles.errorTitle}>Acces Interzis pe Mobil</Text>
                                <Text style={{textAlign:'center', marginTop:10}}>Folosește PC-ul pentru Casa de Marcat.</Text>
                                <Text style={styles.logoutBtn} onPress={() => supabase.auth.signOut()}>DECONECTARE</Text>
                            </View>
                        )}
                    </Stack.Screen>
                ) : userRole === 'agent' ? (
                    <Stack.Screen name="AgentDashboard" component={AgentDashboard} initialParams={{ userId: session.user.id }} />
                ) : (
                    // RUTE PENTRU ADMIN / GESTIONAR
                    <>
                        <Stack.Screen name="DashboardScreen" component={DashboardScreen} />
                        {/* Ruta nouă de adăugare */}
                        <Stack.Screen
                            name="AddProduct"
                            component={AddProductScreen}
                            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                        />
                    </>
                )}

            </Stack.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6', padding: 20 },
    errorTitle: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginTop: 20 },
    logoutBtn: { color: '#2563eb', fontWeight: 'bold', marginTop: 20 }
});