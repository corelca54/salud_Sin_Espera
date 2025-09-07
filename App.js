import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// ==================== CONFIGURACIÓN DE FIREBASE ====================
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';

// CONFIGURACIÓN DE FIREBASE - REEMPLAZA CON TUS CREDENCIALES
const firebaseConfig = {
  apiKey: "AIzaSyB92z0HitEzZD1Y_Z09Fd0i-NznO6kjqgc",
  authDomain: "saludsindemora-ddc85.firebaseapp.com",
  projectId: "saludsindemora-ddc85",
  storageBucket: "saludsindemora-ddc85.firebasestorage.app",
  messagingSenderId: "595432912114",
  appId: "1:595432912114:web:6cbccd2b545ffe37f5cc6b"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// ==================== SERVICIOS DE FIREBASE ====================

// Servicio de autenticación
const authService = {
  register: async (email, password, userData) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await updateProfile(user, {
        displayName: userData.nombreCompleto
      });

      await addDoc(collection(db, 'users'), {
        uid: user.uid,
        nombreCompleto: userData.nombreCompleto,
        email: userData.email,
        role: userData.role,
        createdAt: serverTimestamp()
      });

      return { success: true, user };
    } catch (error) {
      console.error('Error en registro:', error);
      return { success: false, error: error.message };
    }
  },

  login: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Error en login:', error);
      return { success: false, error: error.message };
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Error en logout:', error);
      return { success: false, error: error.message };
    }
  }
};

// Servicio de usuarios
const userService = {
  getUserData: async (uid) => {
    try {
      const q = query(collection(db, 'users'), where('uid', '==', uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return { success: true, userData: { id: userDoc.id, ...userDoc.data() } };
      }
      return { success: false, error: 'Usuario no encontrado' };
    } catch (error) {
      console.error('Error obteniendo datos del usuario:', error);
      return { success: false, error: error.message };
    }
  },

  getAllUsers: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, users };
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      return { success: false, error: error.message };
    }
  }
};

// Servicio de visitas
const visitService = {
  createVisit: async (visitData) => {
    try {
      const docRef = await addDoc(collection(db, 'visits'), {
        ...visitData,
        createdAt: serverTimestamp(),
        status: 'Agendada',
        currentTaskIndex: 0
      });
      return { success: true, visitId: docRef.id };
    } catch (error) {
      console.error('Error creando visita:', error);
      return { success: false, error: error.message };
    }
  },

  updateVisit: async (visitId, updateData) => {
    try {
      const visitRef = doc(db, 'visits', visitId);
      await updateDoc(visitRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error actualizando visita:', error);
      return { success: false, error: error.message };
    }
  },

  getActiveVisit: async (patientId) => {
    try {
      const q = query(
        collection(db, 'visits'),
        where('patientId', '==', patientId),
        where('status', 'in', ['En Proceso', 'Agendada']),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const visitDoc = querySnapshot.docs[0];
        return { success: true, visit: { id: visitDoc.id, ...visitDoc.data() } };
      }
      return { success: true, visit: null };
    } catch (error) {
      console.error('Error obteniendo visita activa:', error);
      return { success: false, error: error.message };
    }
  },

  getUserVisits: async (patientId) => {
    try {
      const q = query(
        collection(db, 'visits'),
        where('patientId', '==', patientId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const visits = [];
      querySnapshot.forEach((doc) => {
        visits.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, visits };
    } catch (error) {
      console.error('Error obteniendo visitas del usuario:', error);
      return { success: false, error: error.message };
    }
  },

  // Listener en tiempo real para visitas activas
  subscribeToActiveVisit: (patientId, callback) => {
    const q = query(
      collection(db, 'visits'),
      where('patientId', '==', patientId),
      where('status', 'in', ['En Proceso', 'Agendada'])
    );
    
    return onSnapshot(q, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const visitDoc = querySnapshot.docs[0];
        callback({ id: visitDoc.id, ...visitDoc.data() });
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error en el listener de visitas:', error);
    });
  }
};

// ==================== CONTEXT GLOBAL ====================
const AppContext = createContext();
const useApp = () => useContext(AppContext);

const { width, height } = Dimensions.get('window');

// Datos simulados mejorados para desarrollo/demo
const mockData = {
  currentVisit: {
    id: 'visit_demo',
    patientId: 'patient_demo',
    visitType: 'Medicina Laboral de Ingreso',
    status: 'En Proceso',
    createdAt: new Date(),
    currentTaskIndex: 1,
    assignedProfessional: 'Dr. María González',
    estimatedDuration: 45,
    tasks: [
      { 
        id: 'task_1', 
        taskName: 'Registro y Documentos', 
        station: 'Recepción', 
        status: 'Finalizado', 
        order: 1,
        completedAt: new Date(Date.now() - 3600000),
        duration: 15,
        professional: 'Ana Receptionist'
      },
      { 
        id: 'task_2', 
        taskName: 'Examen de Oftalmología', 
        station: 'Consultorio 1', 
        status: 'En Proceso', 
        order: 2,
        startedAt: new Date(),
        professional: 'Dr. Carlos Pérez',
        estimatedDuration: 20
      },
      { 
        id: 'task_3', 
        taskName: 'Examen de Sangre', 
        station: 'Laboratorio', 
        status: 'En Espera', 
        order: 3, 
        queuePosition: 3, 
        estimatedWait: 12,
        professional: 'Enf. Laura Martín',
        estimatedDuration: 10
      },
      { 
        id: 'task_4', 
        taskName: 'Consulta General', 
        station: 'Consultorio 3', 
        status: 'En Espera', 
        order: 4, 
        queuePosition: 1, 
        estimatedWait: 25,
        professional: 'Dr. Roberto Silva',
        estimatedDuration: 30
      },
      { 
        id: 'task_5', 
        taskName: 'Entrega de Resultados', 
        station: 'Recepción', 
        status: 'En Espera', 
        order: 5,
        professional: 'Ana Receptionist',
        estimatedDuration: 5
      }
    ]
  },
  visitTypes: [
    'Medicina Laboral de Ingreso',
    'Medicina Laboral Periódica',
    'Consulta General',
    'Examen Preventivo',
    'Control de Seguimiento'
  ],
  professionals: [
    { id: 'prof_1', name: 'Dr. María González', specialty: 'Medicina General', station: 'Consultorio 1' },
    { id: 'prof_2', name: 'Dr. Carlos Pérez', specialty: 'Oftalmología', station: 'Consultorio 2' },
    { id: 'prof_3', name: 'Enf. Laura Martín', specialty: 'Laboratorio', station: 'Laboratorio' },
    { id: 'prof_4', name: 'Dr. Roberto Silva', specialty: 'Cardiología', station: 'Consultorio 3' }
  ]
};

// ==================== COMPONENTE PRINCIPAL ====================
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('auth');
  const [currentVisit, setCurrentVisit] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visitListener, setVisitListener] = useState(null);

  // Listener de autenticación de Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      
      if (user) {
        try {
          // Usuario autenticado, obtener datos adicionales
          const result = await userService.getUserData(user.uid);
          if (result.success) {
            const userData = {
              id: user.uid,
              email: user.email,
              ...result.userData
            };
            setCurrentUser(userData);
            
            // Determinar vista según el rol
            const view = userData.role === 'paciente' ? 'patient-dashboard' : 'professional-dashboard';
            setCurrentView(view);
            
            // Si es paciente, configurar listener para visita activa
            if (userData.role === 'paciente') {
              const listener = visitService.subscribeToActiveVisit(user.uid, (visit) => {
                setCurrentVisit(visit);
              });
              setVisitListener(listener);
            }
          }
        } catch (error) {
          console.error('Error obteniendo datos del usuario:', error);
          setCurrentUser(null);
          setCurrentView('auth');
        }
      } else {
        // Usuario no autenticado - limpiar estado
        setCurrentUser(null);
        setCurrentView('auth');
        setCurrentVisit(null);
        setNotifications([]);
        
        // Limpiar listener si existe
        if (visitListener) {
          visitListener();
          setVisitListener(null);
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (visitListener) {
        visitListener();
      }
    };
  }, [visitListener]);

  // Simulación de notificaciones en tiempo real mejorada
  useEffect(() => {
    if (currentUser && currentUser.role === 'paciente' && currentVisit) {
      const interval = setInterval(() => {
        // Simular diferentes tipos de notificaciones
        if (Math.random() > 0.95) {
          const notifications = [
            {
              id: Date.now(),
              title: '¡Es tu turno!',
              message: `Por favor dirígete a ${currentVisit.tasks[1]?.station}`,
              timestamp: new Date(),
              type: 'turn',
              icon: 'notifications'
            },
            {
              id: Date.now() + 1,
              title: 'Actualización de cola',
              message: 'Tu posición en la cola ha cambiado',
              timestamp: new Date(),
              type: 'queue',
              icon: 'people'
            },
            {
              id: Date.now() + 2,
              title: 'Mensaje del profesional',
              message: 'El doctor indica que terminará en 5 minutos',
              timestamp: new Date(),
              type: 'message',
              icon: 'chatbubble'
            }
          ];
          
          const randomNotification = notifications[Math.floor(Math.random() * notifications.length)];
          setNotifications(prev => [randomNotification, ...prev]);
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 5000);
        }
      }, 15000);

      return () => clearInterval(interval);
    }
  }, [currentUser, currentVisit]);

  const contextValue = {
    currentUser,
    setCurrentUser,
    currentView,
    setCurrentView,
    currentVisit,
    setCurrentVisit,
    notifications,
    setNotifications,
    showNotification,
    setShowNotification,
    loading,
    setLoading
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <AppContext.Provider value={contextValue}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#3B82F6" />
        
        <Header />
        
        {showNotification && notifications.length > 0 && (
          <NotificationAlert notification={notifications[0]} />
        )}

        <View style={styles.content}>
          {!currentUser && <AuthScreen />}
          {currentUser && currentView === 'patient-dashboard' && <PatientDashboard />}
          {currentUser && currentView === 'professional-dashboard' && <ProfessionalDashboard />}
          {currentUser && currentView === 'schedule-visit' && <ScheduleVisit />}
          {currentUser && currentView === 'my-visits' && <MyVisits />}
          {currentUser && currentView === 'notifications' && <NotificationsScreen />}
        </View>

        {currentUser && currentUser.role === 'paciente' && <PatientNavigation />}
      </SafeAreaView>
    </AppContext.Provider>
  );
}

// ==================== COMPONENTES ====================

// Pantalla de carga mejorada
function LoadingScreen() {
  return (
    <LinearGradient colors={['#3B82F6', '#10B981']} style={styles.loadingContainer}>
      <View style={styles.loadingContent}>
        <Ionicons name="medical" size={80} color="white" />
        <Text style={styles.loadingTitle}>SaludSinEspera</Text>
        <Text style={styles.loadingSubtitle}>v2.0</Text>
        <ActivityIndicator size="large" color="white" style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>Cargando...</Text>
        <Text style={styles.loadingSubText}>Conectando con Firebase</Text>
      </View>
    </LinearGradient>
  );
}

// Header mejorado
function Header() {
  const { currentUser, setCurrentUser, setCurrentView, notifications } = useApp();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await authService.logout();
              if (result.success) {
                setCurrentUser(null);
                setCurrentView('auth');
                setShowUserMenu(false);
              } else {
                Alert.alert('Error', 'No se pudo cerrar sesión');
              }
            } catch (error) {
              Alert.alert('Error', 'Ocurrió un error al cerrar sesión');
            }
          }
        }
      ]
    );
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="medical" size={24} color="white" />
          </View>
          <View>
            <Text style={styles.headerTitle}>SaludSinEspera</Text>
            <Text style={styles.headerVersion}>v2.0</Text>
          </View>
        </View>
        
        {currentUser && (
          <View style={styles.headerRight}>
            {/* Botón de notificaciones solo para pacientes */}
            {currentUser.role === 'paciente' && (
              <TouchableOpacity 
                style={styles.notificationButton}
                onPress={() => setCurrentView('notifications')}
              >
                <Ionicons name="notifications" size={20} color="white" />
                {unreadNotifications > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            
            {/* Menú de usuario */}
            <TouchableOpacity 
              onPress={() => setShowUserMenu(!showUserMenu)} 
              style={styles.userButton}
            >
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {currentUser.nombreCompleto}
                </Text>
                <Text style={styles.userRole}>{currentUser.role}</Text>
              </View>
              <View style={styles.userAvatar}>
                <Ionicons name="person" size={20} color="white" />
              </View>
            </TouchableOpacity>

            {/* Menú desplegable */}
            {showUserMenu && (
              <View style={styles.userMenu}>
                <TouchableOpacity style={styles.userMenuItem} onPress={handleLogout}>
                  <Ionicons name="log-out" size={18} color="#EF4444" />
                  <Text style={styles.userMenuItemText}>Cerrar Sesión</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

// Alerta de notificación mejorada
function NotificationAlert({ notification }) {
  const getNotificationColor = (type) => {
    switch (type) {
      case 'turn': return '#10B981';
      case 'queue': return '#3B82F6';
      case 'message': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  return (
    <View style={[styles.notificationAlert, { backgroundColor: getNotificationColor(notification.type) }]}>
      <Ionicons name={notification.icon || 'information-circle'} size={20} color="white" />
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{notification.title}</Text>
        <Text style={styles.notificationMessage}>{notification.message}</Text>
      </View>
      <Text style={styles.notificationTime}>
        {notification.timestamp.toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </Text>
    </View>
  );
}

// Pantalla de autenticación (sin cambios)
function AuthScreen() {
  const { setCurrentUser, setCurrentView, setLoading } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombreCompleto: '',
    role: 'paciente'
  });

  const handleAuth = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (!isLogin && !formData.nombreCompleto) {
      Alert.alert('Error', 'Por favor ingresa tu nombre completo');
      return;
    }

    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await authService.login(formData.email, formData.password);
      } else {
        result = await authService.register(formData.email, formData.password, formData);
      }

      if (result.success) {
        Alert.alert(
          '¡Éxito!', 
          isLogin ? 'Has iniciado sesión correctamente' : 'Cuenta creada exitosamente'
        );
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error inesperado');
    }

    setLoading(false);
  };

  return (
    <ScrollView style={styles.authContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.authCard}>
        <View style={styles.authHeader}>
          <LinearGradient colors={['#3B82F6', '#10B981']} style={styles.authIcon}>
            <Ionicons name={isLogin ? 'log-in' : 'person-add'} size={32} color="white" />
          </LinearGradient>
          <Text style={styles.authTitle}>
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </Text>
        </View>

        <View style={styles.authForm}>
          {!isLogin && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre Completo</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ingresa tu nombre completo"
                value={formData.nombreCompleto}
                onChangeText={(text) => setFormData(prev => ({ ...prev, nombreCompleto: text }))}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.textInput}
              placeholder="ejemplo@correo.com"
              value={formData.email}
              onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contraseña</Text>
            <TextInput
              style={styles.textInput}
              placeholder="••••••••"
              value={formData.password}
              onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
              secureTextEntry
            />
          </View>

          {!isLogin && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Rol</Text>
              <View style={styles.roleSelector}>
                <TouchableOpacity
                  style={[styles.roleOption, formData.role === 'paciente' && styles.roleOptionSelected]}
                  onPress={() => setFormData(prev => ({ ...prev, role: 'paciente' }))}
                >
                  <Text style={[styles.roleOptionText, formData.role === 'paciente' && styles.roleOptionTextSelected]}>
                    Paciente
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleOption, formData.role === 'profesional' && styles.roleOptionSelected]}
                  onPress={() => setFormData(prev => ({ ...prev, role: 'profesional' }))}
                >
                  <Text style={[styles.roleOptionText, formData.role === 'profesional' && styles.roleOptionTextSelected]}>
                    Profesional
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <LinearGradient colors={['#3B82F6', '#10B981']} style={styles.authButton}>
            <TouchableOpacity onPress={handleAuth} style={styles.authButtonContent}>
              <Text style={styles.authButtonText}>
                {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>

          <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchAuthMode}>
            <Text style={styles.switchAuthModeText}>
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

// Dashboard del paciente mejorado
function PatientDashboard() {
  const { currentVisit, currentUser } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simular recarga de datos
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  // Timer para mostrar tiempo transcurrido
  useEffect(() => {
    if (currentVisit) {
      const interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentVisit]);

  // Usar datos simulados para demo si no hay visita real
  const visit = currentVisit || mockData.currentVisit;

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getNextTask = () => {
    return visit?.tasks?.find(task => task.status !== 'Finalizado');
  };

  const getCurrentTask = () => {
    return visit?.tasks?.find(task => task.status === 'En Proceso');
  };

  const getCompletedTasks = () => {
    return visit?.tasks?.filter(task => task.status === 'Finalizado').length || 0;
  };

  const getTotalTasks = () => {
    return visit?.tasks?.length || 0;
  };

  if (!visit) {
    return (
      <ScrollView 
        style={styles.dashboardContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={80} color="#9CA3AF" />
          <Text style={styles.emptyStateTitle}>No tienes visitas activas</Text>
          <Text style={styles.emptyStateSubtitle}>
            Agenda una nueva cita para comenzar tu proceso de atención
          </Text>
          <TouchableOpacity style={styles.scheduleButton}>
            <Text style={styles.scheduleButtonText}>Agendar Cita</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const nextTask = getNextTask();
  const currentTask = getCurrentTask();

  return (
    <ScrollView 
      style={styles.dashboardContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header mejorado de la visita */}
      <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.visitHeaderGradient}>
        <View style={styles.visitHeaderContent}>
          <View style={styles.visitInfo}>
            <Text style={styles.visitType}>{visit.visitType}</Text>
            <Text style={styles.visitStatus}>Estado: {visit.status}</Text>
            <Text style={styles.visitTime}>Tiempo: {formatTime(timeElapsed)}</Text>
          </View>
          <View style={styles.visitStats}>
            <View style={styles.visitStat}>
              <Text style={styles.visitStatValue}>{getCompletedTasks()}/{getTotalTasks()}</Text>
              <Text style={styles.visitStatLabel}>Completados</Text>
            </View>
            {visit.assignedProfessional && (
              <View style={styles.visitStat}>
                <Text style={styles.visitStatValue} numberOfLines={1}>
                  {visit.assignedProfessional}
                </Text>
                <Text style={styles.visitStatLabel}>Profesional</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Barra de progreso */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <LinearGradient 
            colors={['#10B981', '#059669']} 
            style={[
              styles.progressFill, 
              { width: `${(getCompletedTasks() / getTotalTasks()) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          Progreso: {Math.round((getCompletedTasks() / getTotalTasks()) * 100)}%
        </Text>
      </View>

      {/* Alerta de tarea actual */}
      {currentTask && (
        <View style={styles.currentTaskAlert}>
          <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.currentTaskGradient}>
            <View style={styles.currentTaskContent}>
              <Ionicons name="notifications" size={24} color="white" />
              <View style={styles.currentTaskInfo}>
                <Text style={styles.currentTaskTitle}>¡En proceso ahora!</Text>
                <Text style={styles.currentTaskText}>{currentTask.taskName}</Text>
                <Text style={styles.currentTaskLocation}>📍 {currentTask.station}</Text>
                {currentTask.professional && (
                  <Text style={styles.currentTaskProfessional}>👨‍⚕️ {currentTask.professional}</Text>
                )}
              </View>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Información de siguiente tarea */}
      {nextTask && nextTask !== currentTask && (
        <View style={styles.nextTaskInfo}>
          <View style={styles.nextTaskHeader}>
            <Ionicons name="arrow-forward-circle" size={20} color="#3B82F6" />
            <Text style={styles.nextTaskTitle}>Siguiente: {nextTask.taskName}</Text>
          </View>
          <View style={styles.nextTaskDetails}>
            <Text style={styles.nextTaskLocation}>📍 {nextTask.station}</Text>
            {nextTask.professional && (
              <Text style={styles.nextTaskProfessional}>👨‍⚕️ {nextTask.professional}</Text>
            )}
            {nextTask.queuePosition && (
              <Text style={styles.nextTaskQueue}>
                Posición en cola: #{nextTask.queuePosition} • ⏱️ ~{nextTask.estimatedWait} min
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Pipeline de tareas mejorado */}
      <View style={styles.pipelineContainer}>
        <View style={styles.pipelineHeader}>
          <Ionicons name="list" size={24} color="#3B82F6" />
          <Text style={styles.pipelineTitle}>Tu Pipeline de Atención</Text>
          <TouchableOpacity style={styles.refreshButton}>
            <Ionicons name="refresh" size={16} color="#3B82F6" />
          </TouchableOpacity>
        </View>
        
        {visit.tasks.map((task, index) => (
          <TaskCard 
            key={task.id} 
            task={task} 
            isNext={index === visit.tasks.findIndex(t => t.status !== 'Finalizado')}
            isLast={index === visit.tasks.length - 1}
          />
        ))}
      </View>

      {/* Información adicional */}
      <View style={styles.additionalInfo}>
        <View style={styles.infoCard}>
          <Ionicons name="time" size={20} color="#6B7280" />
          <View style={styles.infoCardContent}>
            <Text style={styles.infoCardTitle}>Duración Estimada Total</Text>
            <Text style={styles.infoCardValue}>{visit.estimatedDuration} minutos</Text>
          </View>
        </View>
        
        <View style={styles.infoCard}>
          <Ionicons name="calendar" size={20} color="#6B7280" />
          <View style={styles.infoCardContent}>
            <Text style={styles.infoCardTitle}>Fecha de la cita</Text>
            <Text style={styles.infoCardValue}>
              {new Date().toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// Componente TaskCard mejorado
function TaskCard({ task, isNext, isLast }) {
  const [showActions, setShowActions] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Finalizado': return '#10B981';
      case 'En Proceso': return '#F59E0B';
      default: return '#9CA3AF';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Finalizado': return 'checkmark-circle';
      case 'En Proceso': return 'time';
      default: return 'hourglass';
    }
  };

  const sendQuickResponse = (response) => {
    Alert.alert('Respuesta enviada', `"${response}"`);
    setShowActions(false);
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  return (
    <View style={[
      styles.taskCard, 
      isNext && styles.taskCardActive,
      task.status === 'En Proceso' && styles.taskCardInProcess
    ]}>
      <View style={styles.taskCardContent}>
        <View style={[styles.taskStatus, { backgroundColor: getStatusColor(task.status) }]}>
          <Ionicons name={getStatusIcon(task.status)} size={20} color="white" />
        </View>
        
        <View style={styles.taskInfo}>
          <TouchableOpacity 
            style={styles.taskHeader}
            onPress={() => setExpanded(!expanded)}
          >
            <Text style={styles.taskName}>{task.taskName}</Text>
            <View style={styles.taskMeta}>
              <View style={styles.taskLocation}>
                <Ionicons name="location" size={14} color="#6B7280" />
                <Text style={styles.taskStation}>{task.station}</Text>
              </View>
              <Ionicons 
                name={expanded ? 'chevron-up' : 'chevron-down'} 
                size={16} 
                color="#9CA3AF" 
              />
            </View>
          </TouchableOpacity>

          {/* Información expandible */}
          {expanded && (
            <View style={styles.taskExpandedInfo}>
              {task.professional && (
                <View style={styles.taskDetailRow}>
                  <Ionicons name="person" size={16} color="#6B7280" />
                  <Text style={styles.taskDetailText}>{task.professional}</Text>
                </View>
              )}
              {task.estimatedDuration && (
                <View style={styles.taskDetailRow}>
                  <Ionicons name="time" size={16} color="#6B7280" />
                  <Text style={styles.taskDetailText}>Duración: {task.estimatedDuration} min</Text>
                </View>
              )}
              {task.completedAt && (
                <View style={styles.taskDetailRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.taskDetailText}>
                    Completado: {task.completedAt.toLocaleTimeString('es-ES', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Text>
                </View>
              )}
              {task.startedAt && task.status === 'En Proceso' && (
                <View style={styles.taskDetailRow}>
                  <Ionicons name="play-circle" size={16} color="#F59E0B" />
                  <Text style={styles.taskDetailText}>
                    Iniciado: {task.startedAt.toLocaleTimeString('es-ES', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Text>
                </View>
              )}
            </View>
          )}
          
          {task.status === 'En Espera' && task.queuePosition && (
            <View style={styles.queueInfo}>
              <View style={styles.queueStats}>
                <View style={styles.queueStat}>
                  <Text style={styles.queueStatLabel}>Posición</Text>
                  <Text style={styles.queueStatValue}>#{task.queuePosition}</Text>
                </View>
                <View style={styles.queueStat}>
                  <Text style={styles.queueStatLabel}>Espera</Text>
                  <Text style={styles.queueStatValue}>~{task.estimatedWait} min</Text>
                </View>
              </View>
              <Text style={styles.currentlyServing}>
                🔄 Actualmente atendiendo: Ana P.
              </Text>
            </View>
          )}
          
          {task.status === 'En Proceso' && (
            <View style={styles.activeTask}>
              <View style={styles.activeTaskAlert}>
                <Ionicons name="notifications" size={18} color="#D97706" />
                <Text style={styles.activeTaskText}>
                  ¡Es tu turno! Dirígete a {task.station}
                </Text>
              </View>
              
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={styles.primaryAction}
                  onPress={() => sendQuickResponse('Estoy en camino')}
                >
                  <Ionicons name="walk" size={16} color="white" />
                  <Text style={styles.primaryActionText}>En camino</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={() => setShowActions(!showActions)}
                >
                  <Ionicons name="ellipsis-horizontal" size={16} color="#3B82F6" />
                  <Text style={styles.secondaryActionText}>Más</Text>
                </TouchableOpacity>
              </View>
              
              {showActions && (
                <View style={styles.additionalActions}>
                  <TouchableOpacity
                    style={styles.additionalAction}
                    onPress={() => sendQuickResponse('Terminando otro examen - 2 min')}
                  >
                    <Text style={styles.additionalActionText}>Terminando examen (2 min)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.additionalAction, { backgroundColor: '#8B5CF6' }]}
                    onPress={() => sendQuickResponse('En el baño - 3 min')}
                  >
                    <Text style={styles.additionalActionText}>En el baño (3 min)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.additionalAction, { backgroundColor: '#EF4444' }]}
                    onPress={() => sendQuickResponse('Necesito ayuda/información')}
                  >
                    <Text style={styles.additionalActionText}>Necesito ayuda</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          
          {task.status === 'Finalizado' && (
            <View style={styles.completedTask}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.completedTaskText}>Completado exitosamente</Text>
              {task.duration && (
                <Text style={styles.completedTaskDuration}>
                  Duración: {task.duration} min
                </Text>
              )}
            </View>
          )}
          
          {task.status === 'En Espera' && task.estimatedWait > 15 && (
            <TouchableOpacity style={styles.consultButton}>
              <Ionicons name="chatbubble-outline" size={16} color="#3B82F6" />
              <Text style={styles.consultButtonText}>Consultar estado</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Conector al siguiente */}
      {!isLast && (
        <View style={styles.taskConnector}>
          <View style={[
            styles.connectorLine, 
            { backgroundColor: task.status === 'Finalizado' ? '#10B981' : '#E5E7EB' }
          ]} />
        </View>
      )}
    </View>
  );
}

// Dashboard del profesional mejorado
function ProfessionalDashboard() {
  const { currentUser } = useApp();
  const [currentStation] = useState('Oftalmología');
  const [queue, setQueue] = useState([
    { 
      id: '1', 
      name: 'María González', 
      taskName: 'Examen de Oftalmología', 
      waitTime: '5 min',
      priority: 'normal',
      estimatedDuration: 20,
      notes: 'Primera consulta'
    },
    { 
      id: '2', 
      name: 'Carlos López', 
      taskName: 'Consulta de Seguimiento', 
      waitTime: '12 min',
      priority: 'high',
      estimatedDuration: 15,
      notes: 'Control post-operatorio'
    },
    { 
      id: '3', 
      name: 'Ana Martínez', 
      taskName: 'Examen Preventivo', 
      waitTime: '8 min',
      priority: 'normal',
      estimatedDuration: 25,
      notes: 'Examen anual'
    }
  ]);
  const [currentPatient, setCurrentPatient] = useState(queue[0]);
  const [sessionStats, setSessionStats] = useState({
    attended: 8,
    pending: queue.length,
    avgTime: 18,
    sessionStart: new Date(Date.now() - 4 * 60 * 60 * 1000)
  });

  const callNextPatient = () => {
    if (queue.length > 0) {
      Alert.alert(
        'Llamar Paciente', 
        `¿Llamar a ${queue[0].name} para ${queue[0].taskName}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Llamar', 
            onPress: () => {
              Alert.alert('Paciente Llamado', `${queue[0].name} ha sido notificado`);
              setCurrentPatient(queue[0]);
            }
          }
        ]
      );
    }
  };

  const finishAttention = () => {
    if (currentPatient) {
      Alert.alert(
        'Finalizar Atención', 
        `¿Completar atención para ${currentPatient.name}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Finalizar', 
            onPress: () => {
              setQueue(prev => prev.filter(p => p.id !== currentPatient.id));
              setCurrentPatient(null);
              setSessionStats(prev => ({ 
                ...prev, 
                attended: prev.attended + 1,
                pending: prev.pending - 1
              }));
              Alert.alert('Completado', `Atención finalizada para ${currentPatient.name}`);
            }
          }
        ]
      );
    }
  };

  const sendMessage = (message) => {
    Alert.alert('Mensaje Enviado', `"${message}" ha sido enviado a los pacientes en espera`);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      default: return '#10B981';
    }
  };

  return (
    <ScrollView style={styles.dashboardContainer} showsVerticalScrollIndicator={false}>
      {/* Header del profesional */}
      <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.professionalHeaderGradient}>
        <View style={styles.professionalHeaderContent}>
          <View>
            <Text style={styles.stationName}>{currentStation}</Text>
            <Text style={styles.stationSubtitle}>Estación de trabajo</Text>
            <Text style={styles.professionalName}>Dr. {currentUser?.nombreCompleto}</Text>
          </View>
          <View style={styles.sessionStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{sessionStats.attended}</Text>
              <Text style={styles.statLabel}>Atendidos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{sessionStats.pending}</Text>
              <Text style={styles.statLabel}>En cola</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{sessionStats.avgTime}m</Text>
              <Text style={styles.statLabel}>Promedio</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Paciente actual */}
      {currentPatient && (
        <View style={styles.currentPatientContainer}>
          <LinearGradient colors={['#10B981', '#059669']} style={styles.currentPatientGradient}>
            <View style={styles.currentPatientHeader}>
              <Ionicons name="person-circle" size={32} color="white" />
              <Text style={styles.currentPatientTitle}>Paciente Actual</Text>
            </View>
            <View style={styles.currentPatientInfo}>
              <View style={styles.currentPatientDetails}>
                <Text style={styles.currentPatientName}>{currentPatient.name}</Text>
                <Text style={styles.currentPatientTask}>{currentPatient.taskName}</Text>
                <Text style={styles.currentPatientNotes}>📝 {currentPatient.notes}</Text>
                <Text style={styles.currentPatientDuration}>
                  ⏱️ Duración estimada: {currentPatient.estimatedDuration} min
                </Text>
              </View>
              <TouchableOpacity onPress={finishAttention} style={styles.finishButton}>
                <Ionicons name="checkmark" size={20} color="white" />
                <Text style={styles.finishButtonText}>Finalizar</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Acciones principales */}
      <View style={styles.professionalActions}>
        <TouchableOpacity 
          onPress={callNextPatient} 
          style={[styles.callNextButton, !queue.length && styles.buttonDisabled]}
          disabled={!queue.length}
        >
          <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.actionButtonGradient}>
            <Ionicons name="people" size={32} color="white" />
            <Text style={styles.callNextButtonText}>
              {queue.length ? 'Llamar Siguiente' : 'No hay pacientes'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        {/* Mensajes rápidos */}
        <View style={styles.quickMessages}>
          <Text style={styles.quickMessagesTitle}>Mensajes Rápidos</Text>
          <View style={styles.quickMessageButtons}>
            <TouchableOpacity 
              style={[styles.quickMessageButton, { backgroundColor: '#10B981' }]}
              onPress={() => sendMessage('Ya casi termino')}
            >
              <Ionicons name="time" size={16} color="white" />
              <Text style={styles.quickMessageText}>Casi termino</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.quickMessageButton, { backgroundColor: '#F59E0B' }]}
              onPress={() => sendMessage('Demora 10 minutos más')}
            >
              <Ionicons name="clock" size={16} color="white" />
              <Text style={styles.quickMessageText}>Demoro 10 min</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.quickMessageButton, { backgroundColor: '#8B5CF6' }]}
              onPress={() => sendMessage('Pausa técnica - 5 minutos')}
            >
              <Ionicons name="pause" size={16} color="white" />
              <Text style={styles.quickMessageText}>Pausa técnica</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Lista de cola mejorada */}
      <View style={styles.queueList}>
        <View style={styles.queueHeader}>
          <Text style={styles.queueListTitle}>Cola de Pacientes</Text>
          <View style={styles.queueSummary}>
            <Text style={styles.queueSummaryText}>
              {queue.length} en espera • {queue.reduce((acc, p) => acc + p.estimatedDuration, 0)} min total
            </Text>
          </View>
        </View>
        
        {queue.length === 0 ? (
          <View style={styles.emptyQueue}>
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            <Text style={styles.emptyQueueText}>¡No hay pacientes en cola!</Text>
            <Text style={styles.emptyQueueSubtext}>Buen trabajo completando todas las atenciones</Text>
          </View>
        ) : (
          queue.map((patient, index) => (
            <View key={patient.id} style={styles.queueItem}>
              <View style={styles.queueItemLeft}>
                <View style={[
                  styles.queuePosition, 
                  { backgroundColor: getPriorityColor(patient.priority) }
                ]}>
                  <Text style={styles.queuePositionText}>{index + 1}</Text>
                </View>
                <View style={styles.queuePatientInfo}>
                  <Text style={styles.queuePatientName}>{patient.name}</Text>
                  <Text style={styles.queuePatientTask}>{patient.taskName}</Text>
                  <Text style={styles.queuePatientNotes}>{patient.notes}</Text>
                </View>
              </View>
              <View style={styles.queueItemRight}>
                <Text style={styles.queueWaitTime}>{patient.waitTime}</Text>
                <Text style={styles.queueDuration}>{patient.estimatedDuration} min</Text>
                {patient.priority === 'high' && (
                  <View style={styles.priorityBadge}>
                    <Text style={styles.priorityBadgeText}>Urgente</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Estadísticas de la sesión */}
      <View style={styles.sessionStatsCard}>
        <Text style={styles.sessionStatsTitle}>Estadísticas de la Sesión</Text>
        <View style={styles.sessionStatsGrid}>
          <View style={styles.sessionStatItem}>
            <Ionicons name="time" size={20} color="#3B82F6" />
            <Text style={styles.sessionStatLabel}>Sesión iniciada</Text>
            <Text style={styles.sessionStatValue}>
              {sessionStats.sessionStart.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </View>
          <View style={styles.sessionStatItem}>
            <Ionicons name="people" size={20} color="#10B981" />
            <Text style={styles.sessionStatLabel}>Pacientes atendidos</Text>
            <Text style={styles.sessionStatValue}>{sessionStats.attended}</Text>
          </View>
          <View style={styles.sessionStatItem}>
            <Ionicons name="trending-up" size={20} color="#F59E0B" />
            <Text style={styles.sessionStatLabel}>Tiempo promedio</Text>
            <Text style={styles.sessionStatValue}>{sessionStats.avgTime} minutos</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// Pantalla de agendar visita mejorada
function ScheduleVisit() {
  const { setCurrentView, currentUser } = useApp();
  const [formData, setFormData] = useState({
    visitType: '',
    preferredDate: '',
    preferredTime: '',
    notes: '',
    priority: 'normal'
  });
  const [loading, setLoading] = useState(false);

  const handleSchedule = async () => {
    if (!formData.visitType || !formData.preferredDate || !formData.preferredTime) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    setLoading(true);

    try {
      // Crear las tareas por defecto según el tipo de visita
      const getDefaultTasks = (visitType) => {
        const baseTasks = [
          { taskName: 'Registro y Documentos', station: 'Recepción', order: 1, estimatedDuration: 15 },
          { taskName: 'Entrega de Resultados', station: 'Recepción', order: 5, estimatedDuration: 5 }
        ];

        switch (visitType) {
          case 'Medicina Laboral de Ingreso':
            return [
              ...baseTasks.slice(0, 1),
              { taskName: 'Examen de Oftalmología', station: 'Consultorio 1', order: 2, estimatedDuration: 20 },
              { taskName: 'Examen de Sangre', station: 'Laboratorio', order: 3, estimatedDuration: 10 },
              { taskName: 'Consulta General', station: 'Consultorio 3', order: 4, estimatedDuration: 30 },
              ...baseTasks.slice(1)
            ];
          case 'Medicina Laboral Periódica':
            return [
              ...baseTasks.slice(0, 1),
              { taskName: 'Consulta General', station: 'Consultorio 3', order: 2, estimatedDuration: 25 },
              { taskName: 'Examen Básico', station: 'Laboratorio', order: 3, estimatedDuration: 15 },
              ...baseTasks.slice(1)
            ];
          default:
            return [
              ...baseTasks.slice(0, 1),
              { taskName: 'Consulta General', station: 'Consultorio 1', order: 2, estimatedDuration: 20 },
              ...baseTasks.slice(1)
            ];
        }
      };

      const visitData = {
        patientId: currentUser.id,
        patientName: currentUser.nombreCompleto,
        visitType: formData.visitType,
        scheduledDate: formData.preferredDate,
        scheduledTime: formData.preferredTime,
        notes: formData.notes,
        priority: formData.priority,
        tasks: getDefaultTasks(formData.visitType).map((task, index) => ({
          id: `task_${index + 1}`,
          ...task,
          status: 'En Espera'
        }))
      };

      const result = await visitService.createVisit(visitData);

      if (result.success) {
        Alert.alert(
          '¡Cita Agendada!',
          `Tu cita de ${formData.visitType} ha sido programada para el ${formData.preferredDate} a las ${formData.preferredTime}`,
          [
            {
              text: 'Ver Mi Dashboard',
              onPress: () => setCurrentView('patient-dashboard')
            }
          ]
        );
        
        // Resetear formulario
        setFormData({
          visitType: '',
          preferredDate: '',
          preferredTime: '',
          notes: '',
          priority: 'normal'
        });
      } else {
        Alert.alert('Error', 'No se pudo agendar la cita. Inténtalo de nuevo.');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error inesperado');
    }

    setLoading(false);
  };

  return (
    <ScrollView style={styles.scheduleContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.scheduleHeader}>
        <LinearGradient colors={['#3B82F6', '#10B981']} style={styles.scheduleHeaderGradient}>
          <Ionicons name="calendar-outline" size={32} color="white" />
          <Text style={styles.scheduleTitle}>Agendar Nueva Cita</Text>
          <Text style={styles.scheduleSubtitle}>Programa tu próxima visita médica</Text>
        </LinearGradient>
      </View>

      <View style={styles.scheduleForm}>
        {/* Tipo de visita */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Tipo de Visita *</Text>
          <View style={styles.visitTypeSelector}>
            {mockData.visitTypes.map((type, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.visitTypeOption,
                  formData.visitType === type && styles.visitTypeOptionSelected
                ]}
                onPress={() => setFormData(prev => ({ ...prev, visitType: type }))}
              >
                <Text style={[
                  styles.visitTypeOptionText,
                  formData.visitType === type && styles.visitTypeOptionTextSelected
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Fecha preferida */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Fecha Preferida *</Text>
          <TextInput
            style={styles.formInput}
            placeholder="DD/MM/YYYY"
            value={formData.preferredDate}
            onChangeText={(text) => setFormData(prev => ({ ...prev, preferredDate: text }))}
            keyboardType="numeric"
          />
        </View>

        {/* Hora preferida */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Hora Preferida *</Text>
          <View style={styles.timeSlots}>
            {['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'].map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeSlot,
                  formData.preferredTime === time && styles.timeSlotSelected
                ]}
                onPress={() => setFormData(prev => ({ ...prev, preferredTime: time }))}
              >
                <Text style={[
                  styles.timeSlotText,
                  formData.preferredTime === time && styles.timeSlotTextSelected
                ]}>
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Prioridad */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Prioridad</Text>
          <View style={styles.prioritySelector}>
            {[
              { value: 'normal', label: 'Normal', color: '#10B981' },
              { value: 'medium', label: 'Importante', color: '#F59E0B' },
              { value: 'high', label: 'Urgente', color: '#EF4444' }
            ].map((priority) => (
              <TouchableOpacity
                key={priority.value}
                style={[
                  styles.priorityOption,
                  formData.priority === priority.value && { backgroundColor: priority.color }
                ]}
                onPress={() => setFormData(prev => ({ ...prev, priority: priority.value }))}
              >
                <Text style={[
                  styles.priorityOptionText,
                  formData.priority === priority.value && styles.priorityOptionTextSelected
                ]}>
                  {priority.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notas adicionales */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Notas Adicionales</Text>
          <TextInput
            style={[styles.formInput, styles.textArea]}
            placeholder="Información adicional, síntomas, alergias, etc."
            value={formData.notes}
            onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Información estimada */}
        {formData.visitType && (
          <View style={styles.estimatedInfo}>
            <View style={styles.estimatedInfoHeader}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <Text style={styles.estimatedInfoTitle}>Información Estimada</Text>
            </View>
            <View style={styles.estimatedDetails}>
              <Text style={styles.estimatedDetail}>
                ⏱️ Duración aproximada: {formData.visitType.includes('Ingreso') ? '60-90' : '30-45'} minutos
              </Text>
              <Text style={styles.estimatedDetail}>
                📋 Pasos incluidos: {formData.visitType.includes('Ingreso') ? '5' : '3'} estaciones
              </Text>
              <Text style={styles.estimatedDetail}>
                📍 Ubicación: Clínica SaludSinEspera
              </Text>
            </View>
          </View>
        )}

        {/* Botón de agendar */}
        <LinearGradient colors={['#3B82F6', '#10B981']} style={styles.scheduleButton}>
          <TouchableOpacity 
            onPress={handleSchedule} 
            style={styles.scheduleButtonContent}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="calendar" size={20} color="white" />
                <Text style={styles.scheduleButtonText}>Agendar Cita</Text>
              </>
            )}
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </ScrollView>
  );
}

// Pantalla de mis visitas mejorada
function MyVisits() {
  const { currentUser } = useApp();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadVisits();
  }, []);

  const loadVisits = async () => {
    setLoading(true);
    try {
      const result = await visitService.getUserVisits(currentUser.id);
      if (result.success) {
        setVisits(result.visits);
      } else {
        // Usar datos simulados para demo
        setVisits([
          {
            id: 'visit_1',
            visitType: 'Medicina Laboral de Ingreso',
            status: 'Completada',
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            scheduledDate: '15/12/2024',
            scheduledTime: '09:00',
            duration: 75,
            tasksCompleted: 5,
            totalTasks: 5
          },
          {
            id: 'visit_2',
            visitType: 'Consulta General',
            status: 'Cancelada',
            createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            scheduledDate: '08/12/2024',
            scheduledTime: '14:00',
            cancelReason: 'Paciente no se presentó'
          },
          {
            id: 'visit_3',
            visitType: 'Medicina Laboral Periódica',
            status: 'En Proceso',
            createdAt: new Date(),
            scheduledDate: '22/12/2024',
            scheduledTime: '10:00',
            tasksCompleted: 2,
            totalTasks: 4
          }
        ]);
      }
    } catch (error) {
      console.error('Error cargando visitas:', error);
    }
    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completada': return '#10B981';
      case 'En Proceso': return '#F59E0B';
      case 'Agendada': return '#3B82F6';
      case 'Cancelada': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completada': return 'checkmark-circle';
      case 'En Proceso': return 'time';
      case 'Agendada': return 'calendar';
      case 'Cancelada': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const filteredVisits = visits.filter(visit => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['En Proceso', 'Agendada'].includes(visit.status);
    if (filter === 'completed') return visit.status === 'Completada';
    if (filter === 'cancelled') return visit.status === 'Cancelada';
    return true;
  });

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Cargando tus visitas...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.visitsContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.visitsHeader}>
        <Text style={styles.visitsTitle}>Mis Visitas</Text>
        <Text style={styles.visitsSubtitle}>Historial completo de tus citas médicas</Text>
      </View>

      {/* Filtros */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'all', label: 'Todas' },
            { key: 'active', label: 'Activas' },
            { key: 'completed', label: 'Completadas' },
            { key: 'cancelled', label: 'Canceladas' }
          ].map((filterOption) => (
            <TouchableOpacity
              key={filterOption.key}
              style={[
                styles.filterButton,
                filter === filterOption.key && styles.filterButtonActive
              ]}
              onPress={() => setFilter(filterOption.key)}
            >
              <Text style={[
                styles.filterButtonText,
                filter === filterOption.key && styles.filterButtonTextActive
              ]}>
                {filterOption.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Lista de visitas */}
      {filteredVisits.length === 0 ? (
        <View style={styles.emptyVisits}>
          <Ionicons name="calendar-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyVisitsTitle}>No hay visitas</Text>
          <Text style={styles.emptyVisitsSubtitle}>
            {filter === 'all' 
              ? 'Aún no has programado ninguna cita' 
              : `No tienes visitas ${filter === 'active' ? 'activas' : filter === 'completed' ? 'completadas' : 'canceladas'}`
            }
          </Text>
        </View>
      ) : (
        <View style={styles.visitsList}>
          {filteredVisits.map((visit) => (
            <View key={visit.id} style={styles.visitCard}>
              <View style={styles.visitCardHeader}>
                <View style={styles.visitCardLeft}>
                  <View style={[
                    styles.visitStatus, 
                    { backgroundColor: getStatusColor(visit.status) }
                  ]}>
                    <Ionicons name={getStatusIcon(visit.status)} size={16} color="white" />
                  </View>
                  <View>
                    <Text style={styles.visitCardTitle}>{visit.visitType}</Text>
                    <Text style={styles.visitCardDate}>
                      {visit.scheduledDate} • {visit.scheduledTime}
                    </Text>
                  </View>
                </View>
                <Text style={[
                  styles.visitCardStatus,
                  { color: getStatusColor(visit.status) }
                ]}>
                  {visit.status}
                </Text>
              </View>

              <View style={styles.visitCardContent}>
                {visit.status === 'En Proceso' && (
                  <View style={styles.visitProgress}>
                    <Text style={styles.visitProgressText}>
                      Progreso: {visit.tasksCompleted}/{visit.totalTasks} tareas
                    </Text>
                    <View style={styles.visitProgressBar}>
                      <View style={[
                        styles.visitProgressFill,
                        { width: `${(visit.tasksCompleted / visit.totalTasks) * 100}%` }
                      ]} />
                    </View>
                  </View>
                )}

                {visit.status === 'Completada' && (
                  <View style={styles.visitCompleted}>
                    <Text style={styles.visitCompletedText}>
                      ✅ Completada en {visit.duration} minutos
                    </Text>
                    <Text style={styles.visitCompletedDate}>
                      Finalizada el {new Date(visit.createdAt).toLocaleDateString('es-ES')}
                    </Text>
                  </View>
                )}

                {visit.status === 'Cancelada' && (
                  <View style={styles.visitCancelled}>
                    <Text style={styles.visitCancelledText}>
                      ❌ {visit.cancelReason || 'Visita cancelada'}
                    </Text>
                  </View>
                )}

                {visit.status === 'Agendada' && (
                  <View style={styles.visitScheduled}>
                    <Text style={styles.visitScheduledText}>
                      📅 Programada para {visit.scheduledDate} a las {visit.scheduledTime}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.visitCardActions}>
                {visit.status === 'En Proceso' && (
                  <TouchableOpacity style={styles.visitAction}>
                    <Text style={styles.visitActionText}>Ver Progreso</Text>
                  </TouchableOpacity>
                )}
                {visit.status === 'Completada' && (
                  <TouchableOpacity style={styles.visitAction}>
                    <Text style={styles.visitActionText}>Ver Resultados</Text>
                  </TouchableOpacity>
                )}
                {visit.status === 'Agendada' && (
                  <TouchableOpacity style={[styles.visitAction, styles.visitActionCancel]}>
                    <Text style={styles.visitActionCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// Pantalla de notificaciones mejorada
function NotificationsScreen() {
  const { notifications, setNotifications } = useApp();

  const markAsRead = (notificationId) => {
    setNotifications(prev => prev.map(notification => 
      notification.id === notificationId 
        ? { ...notification, read: true }
        : notification
    ));
  };

  const clearAll = () => {
    Alert.alert(
      'Limpiar Notificaciones',
      '¿Estás seguro que deseas eliminar todas las notificaciones?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Limpiar', onPress: () => setNotifications([]) }
      ]
    );
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'turn': return 'notifications';
      case 'queue': return 'people';
      case 'message': return 'chatbubble';
      default: return 'information-circle';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'turn': return '#10B981';
      case 'queue': return '#3B82F6';
      case 'message': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  return (
    <View style={styles.notificationsContainer}>
      <View style={styles.notificationsHeader}>
        <Text style={styles.notificationsTitle}>Notificaciones</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={clearAll} style={styles.clearAllButton}>
            <Text style={styles.clearAllText}>Limpiar todo</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyNotifications}>
          <Ionicons name="notifications-off" size={64} color="#9CA3AF" />
          <Text style={styles.emptyNotificationsTitle}>No hay notificaciones</Text>
          <Text style={styles.emptyNotificationsSubtitle}>
            Te notificaremos cuando haya actualizaciones sobre tu cita
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
          {notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationItem,
                !notification.read && styles.notificationItemUnread
              ]}
              onPress={() => markAsRead(notification.id)}
            >
              <View style={[
                styles.notificationIcon,
                { backgroundColor: getNotificationColor(notification.type) }
              ]}>
                <Ionicons 
                  name={getNotificationIcon(notification.type)} 
                  size={20} 
                  color="white" 
                />
              </View>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationItemTitle}>{notification.title}</Text>
                <Text style={styles.notificationItemMessage}>{notification.message}</Text>
                <Text style={styles.notificationItemTime}>
                  {notification.timestamp.toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
              {!notification.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// Navegación del paciente mejorada
function PatientNavigation() {
  const { currentView, setCurrentView, notifications } = useApp();

  const unreadCount = notifications.filter(n => !n.read).length;

  const navItems = [
    { key: 'patient-dashboard', icon: 'home', label: 'Inicio' },
    { key: 'schedule-visit', icon: 'calendar', label: 'Agendar' },
    { key: 'my-visits', icon: 'medical', label: 'Mis Citas' },
    { key: 'notifications', icon: 'notifications', label: 'Alertas', badge: unreadCount }
  ];

  return (
    <View style={styles.navigation}>
      {navItems.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={[
            styles.navItem,
            currentView === item.key && styles.navItemActive
          ]}
          onPress={() => setCurrentView(item.key)}
        >
          <View style={styles.navIconContainer}>
            <Ionicons
              name={item.icon}
              size={22}
              color={currentView === item.key ? '#3B82F6' : '#9CA3AF'}
            />
            {item.badge > 0 && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>
                  {item.badge > 9 ? '9+' : item.badge}
                </Text>
              </View>
            )}
          </View>
          <Text style={[
            styles.navLabel,
            currentView === item.key && styles.navLabelActive
          ]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ==================== ESTILOS ====================
const styles = StyleSheet.create({
  // Estilos base
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  content: {
    flex: 1
  },

  // Loading Screen
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingContent: {
    alignItems: 'center'
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16
  },
  loadingSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4
  },
  loadingText: {
    fontSize: 16,
    color: 'white',
    marginTop: 8
  },
  loadingSubText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
    position: 'relative', // Asegurar que el header tenga contexto de posición
    zIndex: 1000 // Z-index alto para el header
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white'
  },
  headerVersion: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)'
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative'
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white'
  },
  userButton: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  userInfo: {
    alignItems: 'flex-end',
    marginRight: 8
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    maxWidth: 100
  },
  userRole: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'capitalize'
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  
  // Overlay para cerrar el menú
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 1500
  },
  
  // Menú de usuario con z-index muy alto
  userMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 90 : 90 + (StatusBar.currentHeight || 0),
    right: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    minWidth: 150,
    zIndex: 2000, // Z-index muy alto
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  userMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8
  },
  userMenuItemText: {
    fontSize: 14,
    color: '#EF4444',
    marginLeft: 8,
    fontWeight: '600'
  },

  // Notification Alert
  notificationAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white'
  },
  notificationMessage: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2
  },
  notificationTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 12
  },

  // Auth Screen
  authContainer: {
    flex: 1,
    padding: 20
  },
  authCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: 32
  },
  authIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  authForm: {
    gap: 20
  },
  inputGroup: {
    gap: 8
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151'
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB'
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8
  },
  roleOption: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    alignItems: 'center'
  },
  roleOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6'
  },
  roleOptionText: {
    fontSize: 14,
    color: '#6B7280'
  },
  roleOptionTextSelected: {
    color: 'white',
    fontWeight: '600'
  },
  authButton: {
    borderRadius: 8,
    marginTop: 8
  },
  authButtonContent: {
    padding: 16,
    alignItems: 'center'
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white'
  },
  switchAuthMode: {
    alignItems: 'center',
    marginTop: 16
  },
  switchAuthModeText: {
    fontSize: 14,
    color: '#3B82F6'
  },

  // Dashboard
  dashboardContainer: {
    flex: 1
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    textAlign: 'center'
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20
  },
  scheduleButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24
  },
  scheduleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },

  // Visit Header
  visitHeaderGradient: {
    margin: 16,
    borderRadius: 16,
    padding: 20
  },
  visitHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  visitInfo: {
    flex: 1
  },
  visitType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white'
  },
  visitStatus: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4
  },
  visitTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2
  },
  visitStats: {
    alignItems: 'flex-end'
  },
  visitStat: {
    alignItems: 'flex-end',
    marginBottom: 8
  },
  visitStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white'
  },
  visitStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)'
  },

  // Progress
  progressContainer: {
    marginHorizontal: 16,
    marginBottom: 16
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 4
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center'
  },

  // Current Task Alert
  currentTaskAlert: {
    margin: 16
  },
  currentTaskGradient: {
    borderRadius: 12,
    padding: 16
  },
  currentTaskContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  currentTaskInfo: {
    flex: 1,
    marginLeft: 12
  },
  currentTaskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white'
  },
  currentTaskText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2
  },
  currentTaskLocation: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4
  },
  currentTaskProfessional: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2
  },

  // Next Task Info
  nextTaskInfo: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  nextTaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  nextTaskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8
  },
  nextTaskDetails: {
    gap: 4
  },
  nextTaskLocation: {
    fontSize: 14,
    color: '#6B7280'
  },
  nextTaskProfessional: {
    fontSize: 14,
    color: '#6B7280'
  },
  nextTaskQueue: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500'
  },

  // Pipeline
  pipelineContainer: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  pipelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  pipelineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 8,
    flex: 1
  },
  refreshButton: {
    padding: 8
  },

  // Task Card
  taskCard: {
    marginBottom: 16,
    position: 'relative'
  },
  taskCardActive: {
    backgroundColor: '#F0F9FF',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 12,
    padding: 12
  },
  taskCardInProcess: {
    backgroundColor: '#FFFBEB',
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 12
  },
  taskCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  taskStatus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  taskInfo: {
    flex: 1
  },
  taskHeader: {
    flex: 1
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937'
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4
  },
  taskLocation: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  taskStation: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4
  },

  // Task Expanded Info
  taskExpandedInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    gap: 6
  },
  taskDetailRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  taskDetailText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8
  },

  // Queue Info
  queueInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8
  },
  queueStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8
  },
  queueStat: {
    alignItems: 'center'
  },
  queueStatLabel: {
    fontSize: 10,
    color: '#92400E'
  },
  queueStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E'
  },
  currentlyServing: {
    fontSize: 11,
    color: '#92400E',
    textAlign: 'center',
    fontStyle: 'italic'
  },

  // Active Task
  activeTask: {
    marginTop: 12,
    gap: 12
  },
  activeTaskAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FED7AA',
    borderRadius: 8
  },
  activeTaskText: {
    fontSize: 14,
    color: '#9A3412',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6
  },
  primaryActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6
  },
  secondaryActionText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600'
  },
  additionalActions: {
    gap: 8
  },
  additionalAction: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  additionalActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500'
  },

  // Completed Task
  completedTask: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 6
  },
  completedTaskText: {
    fontSize: 12,
    color: '#065F46',
    marginLeft: 6
  },
  completedTaskDuration: {
    fontSize: 10,
    color: '#047857',
    marginLeft: 8
  },

  // Consult Button
  consultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 6,
    gap: 4
  },
  consultButtonText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500'
  },

  // Task Connector
  taskConnector: {
    position: 'absolute',
    left: 19,
    top: 50,
    bottom: -16,
    width: 2
  },
  connectorLine: {
    flex: 1,
    width: 2
  },

  // Additional Info
  additionalInfo: {
    margin: 16,
    gap: 12
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  infoCardContent: {
    marginLeft: 12
  },
  infoCardTitle: {
    fontSize: 12,
    color: '#6B7280'
  },
  infoCardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2
  },

  // Professional Dashboard
  professionalHeaderGradient: {
    margin: 16,
    borderRadius: 16,
    padding: 20
  },
  professionalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  stationName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white'
  },
  stationSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2
  },
  professionalName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4
  },
  sessionStats: {
    flexDirection: 'row',
    gap: 16
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white'
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2
  },

  // Current Patient
  currentPatientContainer: {
    margin: 16
  },
  currentPatientGradient: {
    borderRadius: 12,
    padding: 16
  },
  currentPatientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  currentPatientTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8
  },
  currentPatientInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  currentPatientDetails: {
    flex: 1
  },
  currentPatientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white'
  },
  currentPatientTask: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2
  },
  currentPatientNotes: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4
  },
  currentPatientDuration: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 4
  },
  finishButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  },

  // Professional Actions
  professionalActions: {
    margin: 16,
    gap: 16
  },
  callNextButton: {
    borderRadius: 12
  },
  buttonDisabled: {
    opacity: 0.5
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8
  },
  callNextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },

  // Quick Messages
  quickMessages: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  quickMessagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12
  },
  quickMessageButtons: {
    gap: 8
  },
  quickMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6
  },
  quickMessageText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500'
  },

  // Queue List
  queueList: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  queueListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  queueSummary: {},
  queueSummaryText: {
    fontSize: 12,
    color: '#6B7280'
  },
  emptyQueue: {
    alignItems: 'center',
    paddingVertical: 32
  },
  emptyQueueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 12
  },
  emptyQueueSubtext: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4
  },
  queueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  queueItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  queuePosition: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  queuePositionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white'
  },
  queuePatientInfo: {
    flex: 1
  },
  queuePatientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937'
  },
  queuePatientTask: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  queuePatientNotes: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1
  },
  queueItemRight: {
    alignItems: 'flex-end'
  },
  queueWaitTime: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600'
  },
  queueDuration: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2
  },
  priorityBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4
  },
  priorityBadgeText: {
    fontSize: 8,
    color: '#DC2626',
    fontWeight: '600'
  },

  // Session Stats Card
  sessionStatsCard: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  sessionStatsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16
  },
  sessionStatsGrid: {
    gap: 12
  },
  sessionStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  sessionStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1
  },
  sessionStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937'
  },

  // Schedule Visit
  scheduleContainer: {
    flex: 1
  },
  scheduleHeader: {
    margin: 16
  },
  scheduleHeaderGradient: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center'
  },
  scheduleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8
  },
  scheduleSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4
  },
  scheduleForm: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5
  },
  formGroup: {
    marginBottom: 20
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB'
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },

  // Visit Type Selector
  visitTypeSelector: {
    gap: 8
  },
  visitTypeOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    alignItems: 'center'
  },
  visitTypeOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6'
  },
  visitTypeOptionText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center'
  },
  visitTypeOptionTextSelected: {
    color: 'white',
    fontWeight: '600'
  },

  // Time Slots
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  timeSlot: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center'
  },
  timeSlotSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6'
  },
  timeSlotText: {
    fontSize: 14,
    color: '#6B7280'
  },
  timeSlotTextSelected: {
    color: 'white',
    fontWeight: '600'
  },

  // Priority Selector
  prioritySelector: {
    flexDirection: 'row',
    gap: 8
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    alignItems: 'center'
  },
  priorityOptionText: {
    fontSize: 12,
    color: '#6B7280'
  },
  priorityOptionTextSelected: {
    color: 'white',
    fontWeight: '600'
  },

  // Estimated Info
  estimatedInfo: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8
  },
  estimatedInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  estimatedInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginLeft: 8
  },
  estimatedDetails: {
    gap: 6
  },
  estimatedDetail: {
    fontSize: 12,
    color: '#1E40AF'
  },

  // Schedule Button
  scheduleButton: {
    borderRadius: 8,
    marginTop: 16
  },
  scheduleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8
  },
  scheduleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white'
  },

  // My Visits
  visitsContainer: {
    flex: 1
  },
  visitsHeader: {
    padding: 20,
    alignItems: 'center'
  },
  visitsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  visitsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4
  },

  // Filter Container
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
    backgroundColor: 'white'
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6'
  },
  filterButtonText: {
    fontSize: 12,
    color: '#6B7280'
  },
  filterButtonTextActive: {
    color: 'white',
    fontWeight: '600'
  },

  // Empty Visits
  emptyVisits: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40
  },
  emptyVisitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16
  },
  emptyVisitsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8
  },

  // Visits List
  visitsList: {
    paddingHorizontal: 16,
    paddingBottom: 100
  },
  visitCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  visitCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  visitCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  visitStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  visitCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937'
  },
  visitCardDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  visitCardStatus: {
    fontSize: 14,
    fontWeight: '600'
  },
  visitCardContent: {
    marginBottom: 12
  },

  // Visit Progress
  visitProgress: {
    gap: 8
  },
  visitProgressText: {
    fontSize: 12,
    color: '#6B7280'
  },
  visitProgressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden'
  },
  visitProgressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3
  },

  // Visit States
  visitCompleted: {
    gap: 4
  },
  visitCompletedText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '500'
  },
  visitCompletedDate: {
    fontSize: 10,
    color: '#6B7280'
  },
  visitCancelled: {},
  visitCancelledText: {
    fontSize: 12,
    color: '#DC2626'
  },
  visitScheduled: {},
  visitScheduledText: {
    fontSize: 12,
    color: '#1D4ED8'
  },

  // Visit Actions
  visitCardActions: {
    flexDirection: 'row',
    gap: 8
  },
  visitAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3B82F6'
  },
  visitActionText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500'
  },
  visitActionCancel: {
    borderColor: '#EF4444'
  },
  visitActionCancelText: {
    color: '#EF4444'
  },

  // Notifications Screen
  notificationsContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  notificationsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  clearAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8
  },
  clearAllText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500'
  },

  // Empty Notifications
  emptyNotifications: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40
  },
  emptyNotificationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16
  },
  emptyNotificationsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20
  },

  // Notifications List
  notificationsList: {
    flex: 1
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  notificationItemUnread: {
    backgroundColor: '#F0F9FF'
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  notificationContent: {
    flex: 1
  },
  notificationItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937'
  },
  notificationItemMessage: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16
  },
  notificationItemTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginLeft: 8,
    marginTop: 4
  },

  // Navigation
  navigation: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4
  },
  navItemActive: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8
  },
  navIconContainer: {
    position: 'relative',
    marginBottom: 4
  },
  navBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  navBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'white'
  },
  navLabel: {
    fontSize: 10,
    color: '#9CA3AF'
  },
  navLabelActive: {
    color: '#3B82F6',
    fontWeight: '600'
  },

  // Center Container
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8
  },
  featureSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center'
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12
  }
});