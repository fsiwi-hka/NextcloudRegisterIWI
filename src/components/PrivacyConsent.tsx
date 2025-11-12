import React, { useState } from 'react';
import { logger } from '../utils/logger';
import './PrivacyConsent.css';

interface PrivacyConsentProps {
    onAccept: () => void;
}

export const PrivacyConsent: React.FC<PrivacyConsentProps> = ({ onAccept }) => {
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

    const handleAccept = () => {
        if (acceptedTerms && acceptedPrivacy) {
            logger.info('Privacy consent accepted');
            onAccept();
        }
    };

    return (
        <div className="privacy-container">
            <div className="privacy-card">
                <div className="privacy-header">
                    <h1>Datenschutz und Nutzungsbedingungen</h1>
                    <p className="subtitle">
                        Bitte lesen Sie die folgenden Informationen sorgfältig durch und bestätigen Sie Ihre Zustimmung.
                    </p>
                </div>

                <div className="privacy-content">
                    <section className="privacy-section">
                        <h2>1. Datenerhebung und -verarbeitung</h2>
                        <p>
                            Bei der Registrierung für Nextcloud werden folgende personenbezogene Daten erhoben und verarbeitet:
                        </p>
                        <ul>
                            <li>RZ-Benutzername und Passwort (zur Authentifizierung)</li>
                            <li>E-Mail-Adresse (für Kontoinformationen und Benachrichtigungen)</li>
                            <li>Anzeigename (für Nextcloud Anzeigename)</li>
                            <li>Fakultätszugehörigkeit (zur Zugriffskontrolle)</li>
                        </ul>
                    </section>

                    <section className="privacy-section">
                        <h2>2. Zweck der Datenverarbeitung</h2>
                        <p>
                            Ihre Daten werden ausschließlich zu folgenden Zwecken verwendet:
                        </p>
                        <ul>
                            <li>Erstellung und Verwaltung Ihres Nextcloud-Kontos</li>
                            <li>Authentifizierung und Zugriffskontrolle</li>
                            <li>Bereitstellung der Nextcloud-Dienste für IWI-Studierende</li>
                            <li>Technische Administration und Support</li>
                        </ul>
                    </section>

                    <section className="privacy-section">
                        <h2>3. Datenweitergabe</h2>
                        <p>
                            Ihre Daten werden ausschließlich innerhalb der HKA IWI-Infrastruktur verarbeitet.
                            Eine Weitergabe an Dritte erfolgt nicht, es sei denn, dies ist gesetzlich vorgeschrieben.
                        </p>
                    </section>

                    <section className="privacy-section">
                        <h2>4. Datenspeicherung</h2>
                        <p>
                            Ihre Daten werden für die Dauer Ihres Studiums bzw. Ihrer Zugehörigkeit zur
                            IWI-Fakultät gespeichert. Nach Beendigung des Studiums oder auf Ihren Wunsch
                            werden die Daten gelöscht.
                        </p>
                    </section>

                    <section className="privacy-section">
                        <h2>5. Ihre Rechte</h2>
                        <p>
                            Sie haben das Recht auf:
                        </p>
                        <ul>
                            <li>Auskunft über Ihre gespeicherten Daten</li>
                            <li>Berichtigung unrichtiger Daten</li>
                            <li>Löschung Ihrer Daten</li>
                            <li>Einschränkung der Verarbeitung</li>
                            <li>Widerspruch gegen die Verarbeitung</li>
                            <li>Datenübertragbarkeit</li>
                        </ul>
                        <p>
                            Bei Fragen zum Datenschutz wenden Sie sich bitte an:
                            <a href="mailto:datenschutz@iwi-hka.de">datenschutz@iwi-hka.de</a>
                        </p>
                    </section>

                    <section className="privacy-section">
                        <h2>6. Nutzungsbedingungen</h2>
                        <p>
                            Mit der Nutzung des Nextcloud-Dienstes verpflichten Sie sich:
                        </p>
                        <ul>
                            <li>Den Dienst ausschließlich für studienbezogene Zwecke zu nutzen</li>
                            <li>Keine rechtswidrigen Inhalte zu speichern oder zu teilen</li>
                            <li>Die Speicherplatzgrenzen zu beachten</li>
                            <li>Ihre Zugangsdaten vertraulich zu behandeln</li>
                            <li>Bei Missbrauch oder Sicherheitsvorfällen umgehend die Administration zu informieren</li>
                        </ul>
                    </section>
                </div>

                <div className="privacy-checkboxes">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={acceptedPrivacy}
                            onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                        />
                        <span>
                            Ich habe die Datenschutzinformationen gelesen und stimme der Verarbeitung
                            meiner personenbezogenen Daten wie oben beschrieben zu. <span className="required">*</span>
                        </span>
                    </label>

                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                        />
                        <span>
                            Ich habe die Nutzungsbedingungen gelesen und akzeptiere diese. <span className="required">*</span>
                        </span>
                    </label>
                </div>

                <div className="privacy-actions">
                    <button
                        className="btn-accept"
                        onClick={handleAccept}
                        disabled={!acceptedTerms || !acceptedPrivacy}
                    >
                        Zustimmen und fortfahren
                    </button>
                    <p className="privacy-note">
                        <span className="required">*</span> Pflichtfelder - Sie müssen beide Bedingungen
                        akzeptieren, um fortzufahren.
                    </p>
                    <p className="support-contact">
                        Bei Problemen oder Fragen an Louis wenden - Discord: <strong>_starmaster_</strong>
                    </p>
                </div>
            </div>
        </div>
    );
};
