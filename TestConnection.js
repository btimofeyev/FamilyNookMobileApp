// TestConnection.js - Create this as a new file
import React, { useState, useEffect } from 'react';
import { View, Text, Button, ScrollView, StyleSheet } from 'react-native';
import axios from 'axios';

const TestConnection = () => {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  // Simple direct test function
  const testEndpoint = async (name, url) => {
    setLoading(true);
    setResults(prev => ({ ...prev, [name]: { status: 'Testing...' } }));
    
    try {
      console.log(`Testing ${name}: ${url}`);
      const response = await axios.get(url, { 
        timeout: 10000,
        headers: { 'User-Agent': 'FamlyNook-Test/1.0' }
      });
      
      setResults(prev => ({ 
        ...prev, 
        [name]: { 
          status: 'Success', 
          statusCode: response.status,
          data: JSON.stringify(response.data).substring(0, 100) + '...' 
        } 
      }));
      console.log(`✅ ${name} succeeded!`);
    } catch (error) {
      console.error(`❌ ${name} failed:`, error.message);
      setResults(prev => ({ 
        ...prev, 
        [name]: { 
          status: 'Failed', 
          error: error.message,
          details: error.response ? `Status: ${error.response.status}` : 'No response'
        } 
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Backend Connection Test</Text>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Test HTTPS Domain" 
          onPress={() => testEndpoint('https-domain', 'https://famlynook.com/api/health')} 
          disabled={loading}
        />
      </View>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Test HTTP Domain" 
          onPress={() => testEndpoint('http-domain', 'http://famlynook.com/api/health')} 
          disabled={loading}
        />
      </View>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Test IP with Port" 
          onPress={() => testEndpoint('ip-port', 'http://167.99.4.123:3001/api/health')} 
          disabled={loading}
        />
      </View>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Test External API (Control)" 
          onPress={() => testEndpoint('external', 'https://httpbin.org/get')} 
          disabled={loading}
        />
      </View>
      
      <Text style={styles.resultsTitle}>Results:</Text>
      
      {Object.entries(results).map(([key, value]) => (
        <View key={key} style={styles.resultCard}>
          <Text style={styles.resultTitle}>{key}</Text>
          <Text style={styles.resultStatus}>Status: {value.status}</Text>
          {value.statusCode && <Text>Code: {value.statusCode}</Text>}
          {value.error && <Text style={styles.errorText}>Error: {value.error}</Text>}
          {value.details && <Text>{value.details}</Text>}
          {value.data && <Text style={styles.dataText}>Data: {value.data}</Text>}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  buttonContainer: {
    marginVertical: 8
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10
  },
  resultCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  resultTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5
  },
  resultStatus: {
    fontSize: 14,
    marginBottom: 5
  },
  errorText: {
    color: 'red'
  },
  dataText: {
    fontSize: 12,
    marginTop: 5,
    color: '#666'
  }
});

export default TestConnection;