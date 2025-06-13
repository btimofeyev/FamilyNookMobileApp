import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, BlurIntensity } from '../../theme';

const GlassInput = ({
  label,
  icon,
  error,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  style,
  inputStyle,
  multiline = false,
  numberOfLines = 1,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <BlurView
        intensity={BlurIntensity.strong}
        tint="light"
        style={[
          styles.inputBlurView,
          error && styles.inputError,
          isFocused && styles.inputFocused,
          multiline && styles.multilineContainer,
        ]}
      >
        {icon && (
          <Ionicons 
            name={icon} 
            size={20} 
            color={Colors.text.placeholder} 
            style={styles.inputIcon} 
          />
        )}
        
        <TextInput
          style={[
            styles.input,
            icon && styles.inputWithIcon,
            multiline && styles.multilineInput,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.text.placeholder}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          selectionColor={Colors.primary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...props}
        />
      </BlurView>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    fontFamily: Typography.fonts.text,
  },
  inputBlurView: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glass.border,
    backgroundColor: 'transparent',
  },
  inputError: {
    borderColor: Colors.error,
    borderWidth: 1.5,
  },
  inputFocused: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  multilineContainer: {
    alignItems: 'flex-start',
    paddingTop: Spacing.md,
  },
  inputIcon: {
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.sizes.base,
    color: Colors.text.dark,
    fontFamily: Typography.fonts.text,
    minHeight: 44, // Accessibility minimum
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  multilineInput: {
    paddingTop: Spacing.sm,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  errorText: {
    fontSize: Typography.sizes.sm,
    color: Colors.error,
    marginTop: Spacing.xs,
    fontFamily: Typography.fonts.text,
  },
});

export default GlassInput;