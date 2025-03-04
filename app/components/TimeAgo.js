// app/components/TimeAgo.js
import React from 'react';
import { Text } from 'react-native';

export default function TimeAgo({ date, style }) {
  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    let interval = seconds / 31536000; // seconds in a year
    if (interval > 1) {
      return Math.floor(interval) + 'y ago';
    }
    
    interval = seconds / 2592000; // seconds in a month
    if (interval > 1) {
      return Math.floor(interval) + 'mo ago';
    }
    
    interval = seconds / 86400; // seconds in a day
    if (interval > 1) {
      return Math.floor(interval) + 'd ago';
    }
    
    interval = seconds / 3600; // seconds in an hour
    if (interval > 1) {
      return Math.floor(interval) + 'h ago';
    }
    
    interval = seconds / 60; // seconds in a minute
    if (interval > 1) {
      return Math.floor(interval) + 'm ago';
    }
    
    return Math.floor(seconds) + 's ago';
  };

  return <Text style={style}>{getTimeAgo(date)}</Text>;
}