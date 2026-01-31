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
import ReportsScreen from './src/screens/ReportsScreen';
// ✅ MODIFICARE 1: Importă ecranul nou aici
import TeamScreen from './src/screens/TeamScreen';

const Stack = createNativeStackNavigator();

export default function App() {
    const [session, setSession] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    // ... (Logica ta de fetchUserRole rămâne neschimbată) ...
    const fetchUserRole = async (userId, email) => {
        try {
            const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .single();

            if (roleData) return roleData.role;
            if (email === 'admin@magazin.ro') return 'admin';

            const { data: agentData } = await supabase
                .from('agenti')
                .select('id')
                .eq('email', email)
                .single();

            if (agentData) return 'agent';

            return 'admin';
        } catch (error) {
            console.log("Eroare rol:", error);
            return 'admin';
        }
    };

    // ... (useEffect rămâne neschimbat) ...
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

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={{marginTop: 10, color:'#6b7280'}}>Se încarcă sistemul...</Text>
            </View>
        );
    }

    return (
        <NavigationContainer>
            <StatusBar barStyle="dark-content" backgroundColor="#f3f4f6" />
            <Stack.Navigator screenOptions={{ headerShown: false }}>

                {!session ? (
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : (
                    userRole === 'casier' ? (
                        <Stack.Screen name="AccessDenied">
                            {() => (
                                <View style={styles.center}>
                                    <MonitorX size={64} color="#ef4444" />
                                    <Text style={styles.errorTitle}>Acces Interzis pe Mobil</Text>
                                    <Text style={styles.logoutBtn} onPress={() => supabase.auth.signOut()}>
                                        DECONECTARE
                                    </Text>
                                </View>
                            )}
                        </Stack.Screen>
                    ) : userRole === 'agent' ? (
                        <Stack.Screen
                            name="AgentDashboard"
                            component={AgentDashboard}
                            initialParams={{ userId: session.user.id }}
                        />
                    ) : (
                        // --- ADMINISTRATOR / GESTIONAR ---
                        <>
                            <Stack.Screen name="DashboardScreen" component={DashboardScreen} />
                            <Stack.Screen name="AddProduct" component={AddProductScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
                            <Stack.Screen name="ProductsList" component={ProductsListScreen} />
                            <Stack.Screen name="EditProduct" component={EditProductScreen} />
                            <Stack.Screen name="PriceCheck" component={PriceCheckScreen} />
                            <Stack.Screen name="Reports" component={ReportsScreen} />
                            <Stack.Screen name="Settings" component={SettingsScreen} />

                            {/* ✅ MODIFICARE 2: Adaugă ruta 'Team' aici, în blocul de admin */}
                            <Stack.Screen name="Team" component={TeamScreen} />
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