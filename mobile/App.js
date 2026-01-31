import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { supabase } from './src/lib/supabase';
import { MonitorX } from 'lucide-react-native';

// --- IMPORT ECRANE ---
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AgentDashboard from './src/screens/AgentDashboard';
import AddProductScreen from './src/screens/AddProductScreen';
import ProductsListScreen from './src/screens/ProductsListScreen';
import EditProductScreen from './src/screens/EditProductScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import PriceCheckScreen from './src/screens/PriceCheckScreen';
import ReportsScreen from './src/screens/ReportsScreen'; // <--- NOU

const Stack = createNativeStackNavigator();

export default function App() {
    const [session, setSession] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- LOGICĂ DETERMINARE ROL ---
    const fetchUserRole = async (userId, email) => {
        try {
            // 1. Verificăm tabela de permisiuni (user_roles)
            const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .single();

            if (roleData) return roleData.role;

            // 2. Fallback: Super Admin hardcodat
            if (email === 'admin@magazin.ro') return 'admin';

            // 3. Verificăm dacă e Agent
            const { data: agentData } = await supabase
                .from('agenti')
                .select('id')
                .eq('email', email)
                .single();

            if (agentData) return 'agent';

            // Implicit: Admin (pentru teste ușoare)
            return 'admin';
        } catch (error) {
            console.log("Eroare rol:", error);
            return 'admin'; // Fallback safe
        }
    };

    // --- ASCULTĂTOR SESIUNE ---
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                setSession(session);
                const role = await fetchUserRole(session.user.id, session.user.email);
                setUserRole(role);
            }
            setLoading(false);
        };

        checkSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            if (session) {
                setLoading(true);
                const role = await fetchUserRole(session.user.id, session.user.email);
                setUserRole(role);
                setLoading(false);
            } else {
                setUserRole(null);
                setLoading(false);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    // --- LOADING SCREEN ---
    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={{marginTop: 10, color:'#6b7280'}}>Se încarcă sistemul...</Text>
            </View>
        );
    }

    // --- NAVIGATOR PRINCIPAL ---
    return (
        <NavigationContainer>
            <StatusBar barStyle="dark-content" backgroundColor="#f3f4f6" />
            <Stack.Navigator screenOptions={{ headerShown: false }}>

                {/* A. UTILIZATOR NELOGAT */}
                {!session ? (
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : (
                    /* B. UTILIZATOR LOGAT - VERIFICĂM ROLUL */
                    userRole === 'casier' ? (
                        // --- CASIER (ACCES BLOCAT PE MOBIL) ---
                        <Stack.Screen name="AccessDenied">
                            {() => (
                                <View style={styles.center}>
                                    <MonitorX size={64} color="#ef4444" />
                                    <Text style={styles.errorTitle}>Acces Interzis pe Mobil</Text>
                                    <Text style={styles.errorText}>
                                        Conturile de casier pot fi folosite doar pe PC (Casa de Marcat).
                                    </Text>
                                    <Text style={styles.logoutBtn} onPress={() => supabase.auth.signOut()}>
                                        DECONECTARE
                                    </Text>
                                </View>
                            )}
                        </Stack.Screen>
                    ) : userRole === 'agent' ? (
                        // --- AGENT DE VÂNZĂRI ---
                        <Stack.Screen
                            name="AgentDashboard"
                            component={AgentDashboard}
                            initialParams={{ userId: session.user.id }}
                        />
                    ) : (
                        // --- ADMINISTRATOR / GESTIONAR ---
                        <>
                            {/* 1. Meniul Principal */}
                            <Stack.Screen name="DashboardScreen" component={DashboardScreen} />

                            {/* 2. Modul Adăugare (Scanner) */}
                            <Stack.Screen
                                name="AddProduct"
                                component={AddProductScreen}
                                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                            />

                            {/* 3. Modul Gestiune Stoc (Listă) */}
                            <Stack.Screen name="ProductsList" component={ProductsListScreen} />

                            {/* 4. Modul Editare Produs */}
                            <Stack.Screen name="EditProduct" component={EditProductScreen} />

                            {/* 5. Modul Verificator Preț */}
                            <Stack.Screen name="PriceCheck" component={PriceCheckScreen} />

                            {/* 6. Modul Rapoarte */}
                            <Stack.Screen name="Reports" component={ReportsScreen} />

                            {/* 7. Setări Cont */}
                            <Stack.Screen name="Settings" component={SettingsScreen} />
                        </>
                    )
                )}

            </Stack.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6', padding: 20 },
    errorTitle: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginTop: 20, marginBottom: 10 },
    errorText: { textAlign: 'center', color: '#4b5563', marginBottom: 30 },
    logoutBtn: { color: '#2563eb', fontWeight: 'bold', fontSize: 16, padding: 10 }
});