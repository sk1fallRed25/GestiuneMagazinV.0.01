import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { supabase } from './src/lib/supabase';
import { MonitorX } from 'lucide-react-native';

// --- IMPORT ECRANE ---
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SupplierDashboard from './src/screens/SupplierDashboard'; // ✅ NOU
import AgentDashboard from './src/screens/AgentDashboard';
import TeamScreen from './src/screens/TeamScreen';
import AddProductScreen from './src/screens/AddProductScreen';
import ProductsListScreen from './src/screens/ProductsListScreen';
import EditProductScreen from './src/screens/EditProductScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import PriceCheckScreen from './src/screens/PriceCheckScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import { OutboundOrdersScreen, InboundOrdersScreen } from './src/screens/SupplierScreens';

const Stack = createNativeStackNavigator();

export default function App() {
    const [session, setSession] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- LOGICĂ DETERMINARE ROL ---
    const fetchUserRole = async (userId, email) => {
        try {
            // 1. BACKDOOR ADMIN TEST
            if (email === 'admin@admin.com') return 'admin';

            // 2. Verificăm în tabela utilizatori (pentru Furnizori și noi înregistrări)
            const { data: userData, error: userError } = await supabase
                .from('utilizatori')
                .select('rol, aprobat')
                .eq('email', email)
                .single();

            if (userData) {
                // Dacă nu este aprobat, îl blocăm sau îi dăm un rol restricționat
                if (!userData.aprobat) return 'neaprobat';
                return userData.rol;
            }

            // 3. Verificăm tabela de roluri (legacy/admin roles)
            const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .single();

            if (roleData) return roleData.role;

            // 4. Verificăm dacă este Agent
            const { data: agentData } = await supabase
                .from('agenti')
                .select('id')
                .eq('email', email)
                .single();

            if (agentData) return 'agent';

            return 'user';
        } catch (error) {
            console.log("Eroare determinare rol:", error);
            return 'user';
        }
    };

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
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.loadingText}>Se inițializează securitatea...</Text>
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
                    // --- RUTARE ÎN FUNCȚIE DE ROL ---
                    userRole === 'neaprobat' ? (
                        <Stack.Screen name="PendingApproval">
                            {() => (
                                <View style={styles.center}>
                                    <MonitorX size={64} color="#d97706" />
                                    <Text style={styles.errorTitle}>Așteaptă Aprobarea</Text>
                                    <Text style={styles.errorText}>
                                        Contul tău a fost creat, dar un administrator trebuie să îl activeze.
                                    </Text>
                                    <Text style={styles.logoutBtn} onPress={() => supabase.auth.signOut()}>
                                        ÎNAPOI LA LOGIN
                                    </Text>
                                </View>
                            )}
                        </Stack.Screen>
                    ) : userRole === 'furnizor' ? (
                        <Stack.Screen name="SupplierDashboard" component={SupplierDashboard} /> // ✅ RUTĂ FURNIZOR
                    ) : userRole === 'agent' ? (
                        <Stack.Screen name="AgentDashboard" component={AgentDashboard} />
                    ) : (
                        // --- ADMIN / GESTIONAR / CASIER ---
                        <>
                            <Stack.Screen name="DashboardScreen" component={DashboardScreen} />
                            <Stack.Screen name="Team" component={TeamScreen} />
                            <Stack.Screen name="AddProduct" component={AddProductScreen} />
                            <Stack.Screen name="ProductsList" component={ProductsListScreen} />
                            <Stack.Screen name="EditProduct" component={EditProductScreen} />
                            <Stack.Screen name="PriceCheck" component={PriceCheckScreen} />
                            <Stack.Screen name="Reports" component={ReportsScreen} />
                            <Stack.Screen name="Settings" component={SettingsScreen} />
                            <Stack.Screen name="OutboundOrders" component={OutboundOrdersScreen} />
                            <Stack.Screen name="InboundOrders" component={InboundOrdersScreen} />
                        </>
                    )
                )}

            </Stack.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6', padding: 20 },
    loadingText: { marginTop: 10, color: '#6b7280', fontSize: 14 },
    errorTitle: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginTop: 20, marginBottom: 10 },
    errorText: { textAlign: 'center', color: '#4b5563', marginBottom: 30, lineHeight: 20 },
    logoutBtn: { color: '#4F46E5', fontWeight: 'bold', fontSize: 16, padding: 10 }
});