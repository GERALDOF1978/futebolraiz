import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, deleteDoc, onSnapshot, setDoc } from 'firebase/firestore';

// ==========================================
// SUAS CHAVES FIXAS 
// ==========================================
const MINHA_API_KEY = "AIzaSyD6cX5F356OhIxIscJZ9bhkevjX7VMmdrU";
const MEU_CANAL_ID = "UCGB8jiI52Z5NaQbCwnEkF3A"; 

export default function Admin() {
// ... resto do código do Admin continua aqui para baixo ...