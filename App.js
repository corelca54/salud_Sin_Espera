import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
// Importa las funciones de Firebase (Asegúrate de instalar firebase: npm install firebase)
// import { initializeApp } from 'firebase/app';
// import { getFirestore, collection, getDocs } from 'firebase/firestore';

// --- CONFIGURACIÓN DE FIREBASE (REEMPLAZA CON TUS DATOS) ---
// const firebaseConfig = {
//   apiKey: "TU_API_KEY",
//   authDomain: "TU_AUTH_DOMAIN",
//   projectId: "TU_PROJECT_ID",
//   storageBucket: "TU_STORAGE_BUCKET",
//   messagingSenderId: "TU_MESSAGING_SENDER_ID",
//   appId: "TU_APP_ID"
// };

// // Inicializa Firebase
// const app = initializeApp(firebaseConfig);
// const db = getFirestore(app);

// --- Iconos SVG ---
const DoctorIcon = () => ( <Svg height="24" width="24" viewBox="0 0 24 24"><Path fill="#546e7a" d="M12,2A9,9 0 0,0 3,11V21H5V18H19V21H21V11A9,9 0 0,0 12,2M9,10H11V12H9V10M15,12H13V10H15V12M12,16A3,3 0 0,1 9,13H15A3,3 0 0,1 12,16Z" /></Svg> );
const ClockIcon = () => ( <Svg height="24" width="24" viewBox="0 0 24 24"><Path fill="#546e7a" d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5,2 12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" /></Svg> );
const StethoscopeIcon = () => ( <Svg height="24" width="24" viewBox="0 0 24 24"><Path fill="#546e7a" d="M9,4A4,4 0 0,1 13,8V13.37C13.69,13.13 14.5,13 15.5,13A4.5,4.5 0 0,1 20,17.5A4.5,4.5 0 0,1 15.5,22A4.5,4.5 0 0,1 11,17.5V10H10A3,3 0 0,1 7,7A3,3 0 0,1 10,4H9M11,6A1,1 0 0,0 10,7A1,1 0 0,0 11,8H12V6H11M15.5,15A2.5,2.5 0 0,0 13,17.5A2.5,2.5 0 0,0 15.5,20A2.5,2.5 0 0,0 18,17.5A2.5,2.5 0 0,0 15.5,15Z" /></Svg>);

// --- Componente de Fondo Animado ---
const AnimatedGradient = ({ children }) => {
    const animatedValue = new Animated.Value(0);

    useEffect(() => {
        Animated.loop(
            Animated.timing(animatedValue, {
                toValue: 1,
                duration: 4000,
                useNativeDriver: false,
            })
        ).start();
    }, []);

    const color1 = animatedValue.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: ['#e3f2fd', '#bbdefb', '#e3f2fd']
    });

    const color2 = animatedValue.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: ['#f1f8e9', '#dcedc8', '#f1f8e9']
    });

    // Para usar un gradiente real, necesitarías `expo-linear-gradient`
    // Por ahora, simulamos con un color animado
    return (
        <Animated.View style={[styles.container, { backgroundColor: color1 }]}>
            {children}
        </Animated.View>
    );
};


// --- Pantallas ---

function LoginScreen({ navigation }) {
    return (
        <View style={styles.content}>
            <Text style={{fontSize: 80, marginBottom: 20}}>🏥</Text>
            <Text style={styles.title}>SaludSinEspera</Text>
            <Text style={styles.subtitle}>Bienvenido a la IPS "Corazón Sano"</Text>
            <TextInput style={styles.input} placeholder="Número de Documento" keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Contraseña" secureTextEntry />
            <TouchableOpacity style={styles.welcomeButton} onPress={() => navigation.replace('MainApp')}>
                <Text style={styles.welcomeButtonText}>Ingresar</Text>
            </TouchableOpacity>
        </View>
    );
}


function AppointmentsScreen({ navigation }) {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulación de carga desde Firebase
        const fetchAppointments = async () => {
            setLoading(true);
            // const querySnapshot = await getDocs(collection(db, "citas"));
            // const citasData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // setAppointments(citasData);
            
            // Datos de respaldo mientras no hay Firebase
            const mockData = [
                { id: '1', doctor: 'Dr. Ana Pérez', specialty: 'Medicina General', time: '09:00 AM', status: 'Agendada' },
                { id: '2', doctor: 'Dr. Carlos Ruiz', specialty: 'Odontología', time: '11:30 AM', status: 'Confirmada' },
                { id: '3', doctor: 'Dra. Sofía Gómez', specialty: 'Pediatría', time: '02:00 PM', status: 'Agendada' },
                { id: '4', doctor: 'Dr. Luis Jaramillo', specialty: 'Cardiología', time: '04:15 PM', status: 'Agendada' },
            ];
            setTimeout(() => { // Simula el retraso de la red
                setAppointments(mockData);
                setLoading(false);
            }, 1500);
        };

        fetchAppointments();
    }, []);

    if (loading) {
        return <View style={styles.content}><ActivityIndicator size="large" color="#0000ff" /></View>
    }

    return (
        <View style={styles.listContainer}>
            <FlatList
                data={appointments}
                renderItem={({ item }) => <AppointmentCard item={item} />}
                keyExtractor={item => item.id}
                ListHeaderComponent={<Text style={styles.listHeader}>Tus Próximas Citas</Text>}
            />
            <TouchableOpacity style={styles.checkInButton} onPress={() => navigation.navigate('Queue')}>
                <Text style={styles.checkInButtonText}>Hacer Check-in</Text>
            </TouchableOpacity>
        </View>
    );
}

const AppointmentCard = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardIcon}>
        <StethoscopeIcon />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.specialty}</Text>
        <View style={styles.cardInfoRow}>
          <DoctorIcon />
          <Text style={styles.cardText}>{item.doctor}</Text>
        </View>
        <View style={styles.cardInfoRow}>
          <ClockIcon />
          <Text style={styles.cardText}>{item.time}</Text>
        </View>
      </View>
      <View style={[styles.statusBadge, item.status === 'Confirmada' ? styles.statusConfirmed : styles.statusPending]}>
        <Text style={styles.statusText}>{item.status}</Text>
      </View>
    </TouchableOpacity>
);

function QueueScreen() {
    const [queueStatus, setQueueStatus] = useState({
        currentUserTurn: 95,
        currentlyServing: 92,
    });

    const callNext = () => {
        if (queueStatus.currentlyServing < queueStatus.currentUserTurn) {
            setQueueStatus(prev => ({ ...prev, currentlyServing: prev.currentlyServing + 1 }));
        }
    };

    const peopleAhead = queueStatus.currentUserTurn - queueStatus.currentlyServing;

    return (
        <View style={styles.content}>
            <View style={styles.queueCard}>
                <Text style={styles.queueCardLabel}>Tu Turno</Text>
                <Text style={styles.queueCardNumber}>{queueStatus.currentUserTurn}</Text>
            </View>

            <View style={styles.infoGrid}>
                <View style={styles.infoBox}>
                    <Text style={styles.infoBoxValue}>{queueStatus.currentlyServing}</Text>
                    <Text style={styles.infoBoxLabel}>Atendiendo</Text>
                </View>
                <View style={styles.infoBox}>
                    <Text style={styles.infoBoxValue}>{peopleAhead > 0 ? peopleAhead : '¡Siguiente!'}</Text>
                    <Text style={styles.infoBoxLabel}>Delante de ti</Text>
                </View>
            </View>
            
            <View style={styles.doctorActions}>
                <Text style={styles.doctorActionsLabel}>Simulación (Control del Médico)</Text>
                <TouchableOpacity style={styles.welcomeButton} onPress={callNext}>
                    <Text style={styles.welcomeButtonText}>Llamar Siguiente</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// --- Contenedor de la App Principal (post-login) ---
const MainStack = createNativeStackNavigator();

function MainApp() {
    return (
        <MainStack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: '#007aff' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
            }}
        >
            <MainStack.Screen name="Appointments" component={AppointmentsScreen} options={{ title: 'Mis Citas' }} />
            <MainStack.Screen name="Queue" component={QueueScreen} options={{ title: 'Tu Turno en la Fila' }} />
        </MainStack.Navigator>
    );
}

// --- Navegador Principal (Login y App) ---
const RootStack = createNativeStackNavigator();

export default function App() {
    return (
        <AnimatedGradient>
            <SafeAreaView style={styles.container}>
                <NavigationContainer>
                    <RootStack.Navigator screenOptions={{ headerShown: false }}>
                        <RootStack.Screen name="Login" component={LoginScreen} />
                        <RootStack.Screen name="MainApp" component={MainApp} />
                    </RootStack.Navigator>
                </NavigationContainer>
            </SafeAreaView>
        </AnimatedGradient>
    );
}

// --- Estilos ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    listContainer: {
        flex: 1,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#003c8f',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        color: '#5472d3',
        textAlign: 'center',
        marginBottom: 30,
    },
    input: {
        width: '90%',
        height: 50,
        backgroundColor: 'white',
        borderRadius: 10,
        paddingHorizontal: 15,
        fontSize: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#ddd'
    },
    welcomeButton: {
        backgroundColor: '#007aff',
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 30,
        elevation: 3,
        marginTop: 10,
    },
    welcomeButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    listHeader: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#003c8f',
        marginTop: 20,
        marginBottom: 10,
        paddingHorizontal: 20,
    },
    checkInButton: {
        backgroundColor: '#ff9100',
        margin: 20,
        paddingVertical: 15,
        borderRadius: 30,
        alignItems: 'center',
        elevation: 3,
    },
    checkInButtonText: {
      color: 'white',
      fontSize: 18,
      fontWeight: 'bold',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        marginVertical: 8,
        marginHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
    },
    cardIcon: {
        marginRight: 15,
        backgroundColor: '#e3f2fd',
        padding: 12,
        borderRadius: 50,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#003c8f',
        marginBottom: 4,
    },
    cardInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
    },
    cardText: {
        fontSize: 15,
        color: '#546e7a',
        marginLeft: 8,
    },
    statusBadge: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 15,
    },
    statusPending: {
        backgroundColor: '#ffcdd2',
    },
    statusConfirmed: {
        backgroundColor: '#c8e6c9',
    },
    statusText: {
        color: '#3e2723',
        fontWeight: 'bold',
        fontSize: 12,
    },
    queueCard: {
        backgroundColor: '#007aff',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
        width: '90%',
        elevation: 5,
    },
    queueCardLabel: {
        fontSize: 22,
        color: '#e3f2fd',
    },
    queueCardNumber: {
        fontSize: 80,
        fontWeight: 'bold',
        color: 'white',
    },
    infoGrid: {
        flexDirection: 'row',
        width: '90%',
        marginBottom: 20,
    },
    infoBox: {
        alignItems: 'center',
        backgroundColor: 'white',
        paddingVertical: 20,
        borderRadius: 16,
        flex: 1,
        marginHorizontal: 8,
        elevation: 4,
    },
    infoBoxLabel: {
        fontSize: 16,
        color: '#546e7a',
        marginTop: 5,
    },
    infoBoxValue: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#003c8f',
    },
    doctorActions: {
        marginTop: 30,
        alignItems: 'center',
        width: '90%',
        padding: 20,
        backgroundColor: '#f1f1f1',
        borderRadius: 16,
    },
    doctorActionsLabel: {
        fontSize: 14,
        color: '#555',
        marginBottom: 10,
    }
});
