import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { View, Text, Button } from 'react-native';
import { useState } from 'react';
import axios from 'axios';

export default function Index() {
  const { isAuthenticated } = useAuth();
  const [testResults, setTestResults] = useState(null);
  const [testing, setTesting] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    setTestResults('Testing connections...');
    
    try {
      // Test HTTPS domain
      try {
        const httpsResponse = await axios.get('https://famlynook.com/api/health', { timeout: 7000 });
        setTestResults(prev => prev + '\n✅ HTTPS domain works! Status: ' + httpsResponse.status);
      } catch (httpsError) {
        setTestResults(prev => prev + '\n❌ HTTPS domain failed: ' + httpsError.message);
      }
      
      // Test HTTP domain
      try {
        const httpResponse = await axios.get('http://famlynook.com/api/health', { timeout: 7000 });
        setTestResults(prev => prev + '\n✅ HTTP domain works! Status: ' + httpResponse.status);
      } catch (httpError) {
        setTestResults(prev => prev + '\n❌ HTTP domain failed: ' + httpError.message);
      }
      
      // Test IP with port
      try {
        const ipResponse = await axios.get('http://167.99.4.123:3001/api/health', { timeout: 7000 });
        setTestResults(prev => prev + '\n✅ IP with port works! Status: ' + ipResponse.status);
      } catch (ipError) {
        setTestResults(prev => prev + '\n❌ IP with port failed: ' + ipError.message);
      }
      
      // Test external control
      try {
        const controlResponse = await axios.get('https://httpbin.org/get', { timeout: 7000 });
        setTestResults(prev => prev + '\n✅ External API works! Status: ' + controlResponse.status);
      } catch (controlError) {
        setTestResults(prev => prev + '\n❌ External API failed: ' + controlError.message);
      }
      
    } catch (e) {
      setTestResults('Error running tests: ' + e.message);
    } finally {
      setTesting(false);
    }
  };

  // If not testing and not authenticated, redirect
  if (!testing && !testResults && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }
  
  // If not testing and authenticated, redirect
  if (!testing && !testResults && isAuthenticated) {
    return <Redirect href="/(tabs)/feed" />;
  }

  // Show test interface
  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
        Connection Test
      </Text>
      
      <Button 
        title={testing ? "Testing..." : "Test Connections"} 
        onPress={testConnection} 
        disabled={testing}
      />
      
      {testResults && (
        <View style={{ marginTop: 20, padding: 15, backgroundColor: 'white', borderRadius: 8 }}>
          <Text style={{ fontFamily: 'monospace' }}>{testResults}</Text>
        </View>
      )}
      
      <View style={{ marginTop: 20 }}>
        <Button 
          title="Continue to App" 
          onPress={() => {
            if (isAuthenticated) {
              return <Redirect href="/(tabs)/feed" />;
            } else {
              return <Redirect href="/(auth)/login" />;
            }
          }} 
        />
      </View>
    </View>
  );
}