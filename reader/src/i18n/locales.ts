export interface ReaderTranslations {
  app: {
    pageTitle: string;
  };
  navbar: {
    title: string;
    subtitle: string;
    adminBadge: string;
    logout: string;
    languageSelect: string;
  };
  sessionList: {
    title: string;
    refresh: string;
    adminFilterPlaceholder: string;
    searchPlaceholder: string;
    loading: string;
    empty: string;
    segmentsCount: string;
    durationMinutes: string;
  };
  sessionDetail: {
    noSessionTitle: string;
    noSessionDesc: string;
    title: string;
    languageLabel: string;
    segmentsLabel: string;
    mutedVisible: string;
    mutedHidden: string;
    exportTxt: string;
    loading: string;
    empty: string;
    speaker: string;
    mutedTag: string;
  };
  export: {
    sessionHeader: string;
    dateHeader: string;
    languageHeader: string;
    userHeader: string;
    speakerPrefix: string;
    mutedTag: string;
  };
  languageModal: {
    title: string;
    subtitle: string;
    close: string;
  };
  invitationModal: {
    title: string;
    subtitle: string;
    description: string;
    actionNote: string;
    emailLabel: string;
    sendEmail: string;
    copyEmail: string;
    copied: string;
    close: string;
    mailSubject: string;
    mailBody: string;
  };
  auth: {
    loading: string;
    title: string;
    subtitle: string;
    envError: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    signInButton: string;
    signUpButton: string;
    resetPasswordButton: string;
    submitting: string;
    requestInvitation: string;
    switchToSignUp: string;
    switchToSignIn: string;
    forgotPassword: string;
    backToSignIn: string;
    resetEmailSent: string;
    showPassword: string;
    hidePassword: string;
    errors: {
      invalidCredential: string;
      emailInUse: string;
      weakPassword: string;
      invalidEmail: string;
      tooManyRequests: string;
      generic: string;
    };
  };
}

export const readerLocales: Record<string, ReaderTranslations> = {
  ja: {
    app: {
      pageTitle: '書き起こし - 履歴リーダー',
    },
    navbar: {
      title: '書き起こし 履歴リーダー',
      subtitle: '過去90日間の文字起こし履歴',
      adminBadge: '管理者画面',
      logout: 'ログアウト',
      languageSelect: '言語の選択',
    },
    sessionList: {
      title: 'セッション一覧 ({{count}})',
      refresh: '更新',
      adminFilterPlaceholder: 'ユーザーIDで絞り込み (Admin)',
      searchPlaceholder: '検索 (Search sessions)...',
      loading: 'セッションを読み込み中...',
      empty: '履歴が見つかりません',
      segmentsCount: '{{count}} 発言',
      durationMinutes: '{{minutes}} 分間',
    },
    sessionDetail: {
      noSessionTitle: 'セッションが選択されていません',
      noSessionDesc: '左側の一覧から閲覧したい文字起こし履歴を選択してください。',
      title: 'セッション詳細',
      languageLabel: '言語: {{language}}',
      segmentsLabel: '{{count}} 発言',
      mutedVisible: 'ミュート発言: 表示中',
      mutedHidden: 'ミュート発言: 非表示',
      exportTxt: 'TXT 出力',
      loading: '文字起こしを読み込み中...',
      empty: '発言データがありません',
      speaker: '話者 {{number}}',
      mutedTag: 'リアルタイム時にミュート',
    },
    export: {
      sessionHeader: '書き起こし セッション ID: {{id}}',
      dateHeader: '日時: {{date}}',
      languageHeader: '言語: {{language}}',
      userHeader: 'ユーザー: {{userId}}',
      speakerPrefix: '話者 {{number}}',
      mutedTag: '[ミュート]',
    },
    languageModal: {
      title: '言語設定',
      subtitle: '表示言語の選択',
      close: '閉じる',
    },
    invitationModal: {
      title: 'お試し利用・ご招待の申請',
      subtitle: 'Kakiokoshiは現在招待制でご案内しています',
      description: '「書き起こし（Kakiokoshi）」は、高精度なリアルタイムAI音声文字起こしサービスです。\nリアルタイム音声処理にはインフラ費用が発生するため、現在は新規の自由登録を休止し、難聴・聴覚サポートや対面コミュニケーション支援など、真に必要な方を対象とした個別招待（トライアル）制としております。',
      actionNote: 'お試し利用をご希望の方は、ご利用目的やお困りごとを簡単にお書き添えの上、下記のメールアドレスまでご連絡ください。内容を確認の上、トライアルアクセスをご案内いたします。',
      emailLabel: 'お問い合わせ先メールアドレス:',
      sendEmail: 'メールを作成して送信',
      copyEmail: 'アドレスをコピー',
      copied: 'コピーしました！',
      close: '閉じる',
      mailSubject: '【Kakiokoshi】トライアル利用のお申し込み',
      mailBody: 'お名前:\nご利用予定の目的（例：高齢のご家族との会話、難聴サポート、対話支援など）:\nご要望・メッセージ:',
    },
    auth: {
      loading: '読み込み中...',
      title: '書き起こし 履歴リーダー',
      subtitle: '過去90日間の文字起こし履歴・管理閲覧',
      envError: 'Firebaseの環境設定（VITE_FIREBASE_API_KEY / VITE_FIREBASE_PROJECT_ID）が未設定です。.env を確認してください。',
      emailLabel: 'メールアドレス',
      emailPlaceholder: 'example@mail.com',
      passwordLabel: 'パスワード',
      passwordPlaceholder: '6文字以上のパスワード',
      signInButton: 'ログイン',
      signUpButton: '新規登録する',
      resetPasswordButton: '再設定メールを送信',
      submitting: '処理中...',
      requestInvitation: 'アカウントをお持ちでない方（招待・お試しの申請）',
      switchToSignUp: 'アカウントをお持ちでない方はこちら（新規登録）',
      switchToSignIn: 'すでにアカウントをお持ちの方はこちら（ログイン）',
      forgotPassword: 'パスワードをお忘れですか？',
      backToSignIn: 'ログイン画面に戻る',
      resetEmailSent: 'パスワード再設定用のメールを送信しました。メールボックスをご確認ください。',
      showPassword: 'パスワードを表示',
      hidePassword: 'パスワードを隠す',
      errors: {
        invalidCredential: 'メールアドレスまたはパスワードが正しくありません。',
        emailInUse: 'このメールアドレスはすでに登録されています。',
        weakPassword: 'パスワードは6文字以上で入力してください。',
        invalidEmail: '有効なメールアドレスを入力してください。',
        tooManyRequests: '試行回数が多すぎます。しばらく待ってから再度お試しください。',
        generic: '認証エラーが発生しました。もう一度お試しください。',
      },
    },
  },

  en: {
    app: {
      pageTitle: 'Kakiokoshi - Transcript Reader',
    },
    navbar: {
      title: 'Kakiokoshi History Reader',
      subtitle: 'Past 90 days transcription archive',
      adminBadge: 'ADMIN VIEW',
      logout: 'Log Out',
      languageSelect: 'Select Language',
    },
    sessionList: {
      title: 'Sessions ({{count}})',
      refresh: 'Refresh',
      adminFilterPlaceholder: 'Filter by User ID (Admin)',
      searchPlaceholder: 'Search sessions...',
      loading: 'Loading sessions...',
      empty: 'No sessions found',
      segmentsCount: '{{count}} segments',
      durationMinutes: '{{minutes}} min',
    },
    sessionDetail: {
      noSessionTitle: 'No session selected',
      noSessionDesc: 'Select a transcription session from the list on the left to read.',
      title: 'Session Details',
      languageLabel: 'Language: {{language}}',
      segmentsLabel: '{{count}} segments',
      mutedVisible: 'Muted speech: Shown',
      mutedHidden: 'Muted speech: Hidden',
      exportTxt: 'Export TXT',
      loading: 'Loading transcripts...',
      empty: 'No utterances in this session',
      speaker: 'Speaker {{number}}',
      mutedTag: 'Muted during live session',
    },
    export: {
      sessionHeader: 'Kakiokoshi Transcript Session: {{id}}',
      dateHeader: 'Date: {{date}}',
      languageHeader: 'Language: {{language}}',
      userHeader: 'User: {{userId}}',
      speakerPrefix: 'Speaker {{number}}',
      mutedTag: '[MUTED]',
    },
    languageModal: {
      title: 'Language Settings',
      subtitle: 'Select display language',
      close: 'Close',
    },
    invitationModal: {
      title: 'Request Trial Invitation',
      subtitle: 'Kakiokoshi is currently invitation-only',
      description: 'Kakiokoshi is a dedicated real-time speech transcription service.\nBecause live AI audio streaming incurs continuous cloud infrastructure costs, self-registration is currently paused. We provide curated trial access prioritized for individuals and organizations with genuine accessibility, hearing assistance, and communication needs.',
      actionNote: 'If you would like to test Kakiokoshi, please send an email explaining your needs or intended use case. We will review your request and get in touch to set up your trial access.',
      emailLabel: 'Contact Email Address:',
      sendEmail: 'Send Request Email',
      copyEmail: 'Copy Email',
      copied: 'Copied!',
      close: 'Close',
      mailSubject: 'Kakiokoshi Trial Access Request',
      mailBody: 'Name:\nIntended use case or accessibility need (e.g., family conversations, hearing assistance):\nAny additional questions:',
    },
    auth: {
      loading: 'Loading session...',
      title: 'Kakiokoshi History Reader',
      subtitle: 'Transcription History & Admin Reader',
      envError: 'Firebase configuration (VITE_FIREBASE_API_KEY / VITE_FIREBASE_PROJECT_ID) is missing. Please check .env',
      emailLabel: 'Email Address',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'Password',
      passwordPlaceholder: 'At least 6 characters',
      signInButton: 'Sign In',
      signUpButton: 'Create Account',
      resetPasswordButton: 'Send Reset Email',
      submitting: 'Please wait...',
      requestInvitation: "Don't have an account? Request an invitation",
      switchToSignUp: "Don't have an account? Create one",
      switchToSignIn: 'Already have an account? Sign in',
      forgotPassword: 'Forgot your password?',
      backToSignIn: 'Back to Sign In',
      resetEmailSent: 'Password reset email sent. Please check your inbox.',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      errors: {
        invalidCredential: 'Incorrect email or password.',
        emailInUse: 'This email address is already in use.',
        weakPassword: 'Password must be at least 6 characters.',
        invalidEmail: 'Please enter a valid email address.',
        tooManyRequests: 'Too many attempts. Please try again later.',
        generic: 'Authentication failed. Please try again.',
      },
    },
  },

  es: {
    app: {
      pageTitle: 'Kakiokoshi - Lector de transcripciones',
    },
    navbar: {
      title: 'Lector de Historial Kakiokoshi',
      subtitle: 'Archivo de transcripciones de los últimos 90 días',
      adminBadge: 'VISTA DE ADMIN',
      logout: 'Cerrar sesión',
      languageSelect: 'Seleccionar idioma',
    },
    sessionList: {
      title: 'Sesiones ({{count}})',
      refresh: 'Actualizar',
      adminFilterPlaceholder: 'Filtrar por ID de usuario (Admin)',
      searchPlaceholder: 'Buscar sesiones...',
      loading: 'Cargando sesiones...',
      empty: 'No se encontraron sesiones',
      segmentsCount: '{{count}} intervenciones',
      durationMinutes: '{{minutes}} min',
    },
    sessionDetail: {
      noSessionTitle: 'Ninguna sesión seleccionada',
      noSessionDesc: 'Selecciona una sesión de la lista de la izquierda para leerla.',
      title: 'Detalles de la sesión',
      languageLabel: 'Idioma: {{language}}',
      segmentsLabel: '{{count}} intervenciones',
      mutedVisible: 'Silenciados: Visibles',
      mutedHidden: 'Silenciados: Ocultos',
      exportTxt: 'Exportar TXT',
      loading: 'Cargando transcripciones...',
      empty: 'No hay intervenciones en esta sesión',
      speaker: 'Hablante {{number}}',
      mutedTag: 'Silenciado en vivo',
    },
    export: {
      sessionHeader: 'Sesión de transcripción Kakiokoshi: {{id}}',
      dateHeader: 'Fecha: {{date}}',
      languageHeader: 'Idioma: {{language}}',
      userHeader: 'Usuario: {{userId}}',
      speakerPrefix: 'Hablante {{number}}',
      mutedTag: '[SILENCIADO]',
    },
    languageModal: {
      title: 'Configuración de idioma',
      subtitle: 'Selecciona el idioma de visualización',
      close: 'Cerrar',
    },
    invitationModal: {
      title: 'Solicitar invitación de prueba',
      subtitle: 'Kakiokoshi funciona actualmente con acceso por invitación',
      description: 'Kakiokoshi es un servicio de transcripción de voz en tiempo real de alta precisión.\nDebido a que el procesamiento de audio con IA en directo genera costes continuos de infraestructura, el registro libre está pausado y ofrecemos acceso de prueba priorizando a personas y entidades con necesidades reales de accesibilidad o apoyo auditivo.',
      actionNote: 'Si deseas probar Kakiokoshi, por favor envíanos un correo electrónico explicando brevemente tu situación o necesidad. Estaremos encantados de responderte para coordinar tu acceso de prueba.',
      emailLabel: 'Correo electrónico de contacto:',
      sendEmail: 'Enviar correo de solicitud',
      copyEmail: 'Copiar correo',
      copied: '¡Copiado!',
      close: 'Cerrar',
      mailSubject: 'Solicitud de acceso de prueba a Kakiokoshi',
      mailBody: 'Nombre:\nUso previsto o necesidad de accesibilidad (p. ej., conversación con familiares, apoyo auditivo):\nMensaje adicional:',
    },
    auth: {
      loading: 'Cargando sesión...',
      title: 'Lector de Historial Kakiokoshi',
      subtitle: 'Historial de transcripciones y visor de administración',
      envError: 'Falta la configuración de Firebase en .env (VITE_FIREBASE_API_KEY / VITE_FIREBASE_PROJECT_ID).',
      emailLabel: 'Correo electrónico',
      emailPlaceholder: 'tu@ejemplo.com',
      passwordLabel: 'Contraseña',
      passwordPlaceholder: 'Mínimo 6 caracteres',
      signInButton: 'Iniciar sesión',
      signUpButton: 'Crear cuenta',
      resetPasswordButton: 'Enviar enlace de recuperación',
      submitting: 'Procesando...',
      requestInvitation: '¿No tienes cuenta? Solicitar una invitación',
      switchToSignUp: '¿No tienes cuenta? Regístrate',
      switchToSignIn: '¿Ya tienes cuenta? Inicia sesión',
      forgotPassword: '¿Olvidaste tu contraseña?',
      backToSignIn: 'Volver al inicio de sesión',
      resetEmailSent: 'Se ha enviado un correo para restablecer tu contraseña.',
      showPassword: 'Mostrar contraseña',
      hidePassword: 'Ocultar contraseña',
      errors: {
        invalidCredential: 'Correo electrónico o contraseña incorrectos.',
        emailInUse: 'Este correo electrónico ya está registrado.',
        weakPassword: 'La contraseña debe tener al menos 6 caracteres.',
        invalidEmail: 'Introduce un correo electrónico válido.',
        tooManyRequests: 'Demasiados intentos. Inténtalo más tarde.',
        generic: 'Error de autenticación. Inténtalo de nuevo.',
      },
    },
  },

  fr: {
    app: {
      pageTitle: 'Kakiokoshi - Lecteur de transcriptions',
    },
    navbar: {
      title: 'Lecteur d’Historique Kakiokoshi',
      subtitle: 'Archive des transcriptions des 90 derniers jours',
      adminBadge: 'VUE ADMIN',
      logout: 'Déconnexion',
      languageSelect: 'Choisir la langue',
    },
    sessionList: {
      title: 'Sessions ({{count}})',
      refresh: 'Actualiser',
      adminFilterPlaceholder: 'Filtrer par identifiant utilisateur (Admin)',
      searchPlaceholder: 'Rechercher des sessions...',
      loading: 'Chargement des sessions...',
      empty: 'Aucune session trouvée',
      segmentsCount: '{{count}} prises de parole',
      durationMinutes: '{{minutes}} min',
    },
    sessionDetail: {
      noSessionTitle: 'Aucune session sélectionnée',
      noSessionDesc: 'Sélectionnez une session dans la liste à gauche pour la lire.',
      title: 'Détails de la session',
      languageLabel: 'Langue : {{language}}',
      segmentsLabel: '{{count}} prises de parole',
      mutedVisible: 'Paroles masquées : Affichées',
      mutedHidden: 'Paroles masquées : Masquées',
      exportTxt: 'Exporter TXT',
      loading: 'Chargement des transcriptions...',
      empty: 'Aucune prise de parole dans cette session',
      speaker: 'Interlocuteur {{number}}',
      mutedTag: 'Masqué en direct',
    },
    export: {
      sessionHeader: 'Session de transcription Kakiokoshi : {{id}}',
      dateHeader: 'Date : {{date}}',
      languageHeader: 'Langue : {{language}}',
      userHeader: 'Utilisateur : {{userId}}',
      speakerPrefix: 'Interlocuteur {{number}}',
      mutedTag: '[MASQUÉ]',
    },
    languageModal: {
      title: 'Paramètres de langue',
      subtitle: 'Sélectionnez la langue d’affichage',
      close: 'Fermer',
    },
    invitationModal: {
      title: "Demande d'invitation d'essai",
      subtitle: "Kakiokoshi est actuellement accessible sur invitation",
      description: "Kakiokoshi est un service de transcription vocale en temps réel haute précision.\nLe traitement audio par IA en continu engendrant des coûts d'infrastructure, l'inscription libre est actuellement suspendue afin de privilégier les personnes et structures ayant un besoin réel d'accessibilité ou d'assistance auditive.",
      actionNote: "Si vous souhaitez tester Kakiokoshi, merci de nous envoyer un e-mail décrivant brièvement votre situation ou votre besoin. Nous serons ravis de vous contacter pour vous ouvrir un accès d'essai.",
      emailLabel: 'Adresse e-mail de contact :',
      sendEmail: "Envoyer l'e-mail de demande",
      copyEmail: "Copier l'adresse e-mail",
      copied: 'Copié !',
      close: 'Fermer',
      mailSubject: "Demande d'accès d'essai à Kakiokoshi",
      mailBody: 'Nom :\nUsage prévu ou besoin d’accessibilité (ex. : conversations familiales, aide auditive) :\nMessage complémentaire :',
    },
    auth: {
      loading: 'Chargement de la session...',
      title: 'Lecteur d’Historique Kakiokoshi',
      subtitle: 'Historique des transcriptions et consultation administrateur',
      envError: 'Configuration Firebase manquante dans .env (VITE_FIREBASE_API_KEY / VITE_FIREBASE_PROJECT_ID).',
      emailLabel: 'Adresse e-mail',
      emailPlaceholder: 'vous@exemple.com',
      passwordLabel: 'Mot de passe',
      passwordPlaceholder: 'Au moins 6 caractères',
      signInButton: 'Se connecter',
      signUpButton: 'Créer un compte',
      resetPasswordButton: 'Envoyer le lien de réinitialisation',
      submitting: 'Veuillez patienter...',
      requestInvitation: 'Pas de compte ? Demander une invitation',
      switchToSignUp: 'Pas encore de compte ? Créer un compte',
      switchToSignIn: 'Déjà un compte ? Se connecter',
      forgotPassword: 'Mot de passe oublié ?',
      backToSignIn: 'Retour à la connexion',
      resetEmailSent: 'E-mail de réinitialisation envoyé. Vérifiez votre boîte de réception.',
      showPassword: 'Afficher le mot de passe',
      hidePassword: 'Masquer le mot de passe',
      errors: {
        invalidCredential: 'Adresse e-mail ou mot de passe incorrect.',
        emailInUse: 'Cette adresse e-mail est déjà utilisée.',
        weakPassword: 'Le mot de passe doit contenir au moins 6 caractères.',
        invalidEmail: 'Veuillez saisir une adresse e-mail valide.',
        tooManyRequests: 'Trop de tentatives. Veuillez réessayer plus tard.',
        generic: "Échec de l'authentification. Veuillez réessayer.",
      },
    },
  },

  de: {
    app: {
      pageTitle: 'Kakiokoshi - Transkript-Reader',
    },
    navbar: {
      title: 'Kakiokoshi Verlaufs-Reader',
      subtitle: 'Transkriptionsarchiv der letzten 90 Tage',
      adminBadge: 'ADMIN-ANSICHT',
      logout: 'Abmelden',
      languageSelect: 'Sprache auswählen',
    },
    sessionList: {
      title: 'Sitzungen ({{count}})',
      refresh: 'Aktualisieren',
      adminFilterPlaceholder: 'Nach Benutzer-ID filtern (Admin)',
      searchPlaceholder: 'Sitzungen suchen...',
      loading: 'Sitzungen werden geladen...',
      empty: 'Keine Sitzungen gefunden',
      segmentsCount: '{{count}} Beiträge',
      durationMinutes: '{{minutes}} Min.',
    },
    sessionDetail: {
      noSessionTitle: 'Keine Sitzung ausgewählt',
      noSessionDesc: 'Wählen Sie links eine Sitzung aus, um sie zu lesen.',
      title: 'Sitzungsdetails',
      languageLabel: 'Sprache: {{language}}',
      segmentsLabel: '{{count}} Beiträge',
      mutedVisible: 'Stummgeschaltet: Angezeigt',
      mutedHidden: 'Stummgeschaltet: Ausgeblendet',
      exportTxt: 'TXT exportieren',
      loading: 'Transkripte werden geladen...',
      empty: 'Keine Beiträge in dieser Sitzung',
      speaker: 'Sprecher {{number}}',
      mutedTag: 'Live stummgeschaltet',
    },
    export: {
      sessionHeader: 'Kakiokoshi Transkriptionssitzung: {{id}}',
      dateHeader: 'Datum: {{date}}',
      languageHeader: 'Sprache: {{language}}',
      userHeader: 'Benutzer: {{userId}}',
      speakerPrefix: 'Sprecher {{number}}',
      mutedTag: '[STUMM]',
    },
    languageModal: {
      title: 'Spracheinstellungen',
      subtitle: 'Anzeigesprache auswählen',
      close: 'Schließen',
    },
    invitationModal: {
      title: 'Einladung zum Testen anfragen',
      subtitle: 'Kakiokoshi ist derzeit nur auf Einladung zugänglich',
      description: 'Kakiokoshi ist ein hochpräziser Echtzeit-Sprachtranskriptionsdienst.\nDa die KI-Audioverarbeitung erhebliche Serverkosten verursacht, ist die freie Registrierung derzeit pausiert. Wir vergeben gezielte Testzugänge vorrangig an Personen und Organisationen mit echtem Bedarf an Barrierefreiheit und Hörunterstützung.',
      actionNote: 'Wenn Sie Kakiokoshi testen möchten, senden Sie uns bitte eine E-Mail mit einer kurzen Schilderung Ihres Bedarfs. Wir setzen uns gerne mit Ihnen in Verbindung, um Ihren Testzugang einzurichten.',
      emailLabel: 'Kontakt-E-Mail-Adresse:',
      sendEmail: 'E-Mail zur Anfrage verfassen',
      copyEmail: 'E-Mail-Adresse kopieren',
      copied: 'Kopiert!',
      close: 'Schließen',
      mailSubject: 'Anfrage für Kakiokoshi Testzugang',
      mailBody: 'Name:\nEinsatzzweck oder Unterstützungsbedarf (z. B. Familiengespräche, Hörhilfe):\nWeitere Anmerkungen:',
    },
    auth: {
      loading: 'Sitzung wird geladen...',
      title: 'Kakiokoshi Verlaufs-Reader',
      subtitle: 'Transkriptionsverlauf & Admin-Reader',
      envError: 'Firebase-Konfiguration fehlt in .env (VITE_FIREBASE_API_KEY / VITE_FIREBASE_PROJECT_ID).',
      emailLabel: 'E-Mail-Adresse',
      emailPlaceholder: 'name@beispiel.de',
      passwordLabel: 'Passwort',
      passwordPlaceholder: 'Mindestens 6 Zeichen',
      signInButton: 'Anmelden',
      signUpButton: 'Konto erstellen',
      resetPasswordButton: 'Link zum Zurücksetzen senden',
      submitting: 'Bitte warten...',
      requestInvitation: 'Noch kein Konto? Einladung anfragen',
      switchToSignUp: 'Noch kein Konto? Jetzt registrieren',
      switchToSignIn: 'Bereits ein Konto? Anmelden',
      forgotPassword: 'Passwort vergessen?',
      backToSignIn: 'Zurück zur Anmeldung',
      resetEmailSent: 'E-Mail zum Zurücksetzen des Passworts wurde gesendet.',
      showPassword: 'Passwort anzeigen',
      hidePassword: 'Passwort verbergen',
      errors: {
        invalidCredential: 'E-Mail-Adresse oder Passwort ist falsch.',
        emailInUse: 'Diese E-Mail-Adresse wird bereits verwendet.',
        weakPassword: 'Das Passwort muss mindestens 6 Zeichen lang sein.',
        invalidEmail: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
        tooManyRequests: 'Zu viele Versuche. Bitte versuchen Sie es später erneut.',
        generic: 'Authentifizierung fehlgeschlagen. Bitte erneut versuchen.',
      },
    },
  },

  pt: {
    app: {
      pageTitle: 'Kakiokoshi - Leitor de transcrições',
    },
    navbar: {
      title: 'Leitor de Histórico Kakiokoshi',
      subtitle: 'Arquivo de transcrições dos últimos 90 dias',
      adminBadge: 'VISÃO DE ADMIN',
      logout: 'Sair',
      languageSelect: 'Selecionar Idioma',
    },
    sessionList: {
      title: 'Sessões ({{count}})',
      refresh: 'Atualizar',
      adminFilterPlaceholder: 'Filtrar por ID de usuário (Admin)',
      searchPlaceholder: 'Buscar sessões...',
      loading: 'Carregando sessões...',
      empty: 'Nenhuma sessão encontrada',
      segmentsCount: '{{count}} falas',
      durationMinutes: '{{minutes}} min',
    },
    sessionDetail: {
      noSessionTitle: 'Nenhuma sessão selecionada',
      noSessionDesc: 'Selecione uma sessão na lista à esquerda para lê-la.',
      title: 'Detalhes da Sessão',
      languageLabel: 'Idioma: {{language}}',
      segmentsLabel: '{{count}} falas',
      mutedVisible: 'Silenciados: Visíveis',
      mutedHidden: 'Silenciados: Ocultos',
      exportTxt: 'Exportar TXT',
      loading: 'Carregando transcrições...',
      empty: 'Nenhuma fala nesta sessão',
      speaker: 'Interlocutor {{number}}',
      mutedTag: 'Silenciado ao vivo',
    },
    export: {
      sessionHeader: 'Sessão de Transcrição Kakiokoshi: {{id}}',
      dateHeader: 'Data: {{date}}',
      languageHeader: 'Idioma: {{language}}',
      userHeader: 'Usuário: {{userId}}',
      speakerPrefix: 'Interlocutor {{number}}',
      mutedTag: '[SILENCIADO]',
    },
    languageModal: {
      title: 'Configurações de Idioma',
      subtitle: 'Selecione o idioma de exibição',
      close: 'Fechar',
    },
    invitationModal: {
      title: 'Solicitar convite de teste',
      subtitle: 'O Kakiokoshi está atualmente disponível por convite',
      description: 'O Kakiokoshi é um serviço de transcrição de voz em tempo real de alta precisão.\nComo o processamento contínuo de áudio por IA gera custos de infraestrutura, o cadastro aberto está suspenso, priorizando o acesso experimental a pessoas e organizações com necessidades reais de acessibilidade e apoio à audição.',
      actionNote: 'Se você deseja experimentar o Kakiokoshi, envie-nos um e-mail explicando brevemente sua situação e necessidade. Entraremos em contato com prazer para providenciar seu acesso de teste.',
      emailLabel: 'E-mail de contato:',
      sendEmail: 'Enviar e-mail de solicitação',
      copyEmail: 'Copiar e-mail',
      copied: 'Copiado!',
      close: 'Fechar',
      mailSubject: 'Solicitação de acesso de teste ao Kakiokoshi',
      mailBody: 'Nome:\nUso pretendido ou necessidade de acessibilidade (ex.: conversa familiar, apoio auditivo):\nMensagem adicional:',
    },
    auth: {
      loading: 'Carregando sessão...',
      title: 'Leitor de Histórico Kakiokoshi',
      subtitle: 'Histórico de Transcrições e Leitor Admin',
      envError: 'Configuração do Firebase ausente no .env (VITE_FIREBASE_API_KEY / VITE_FIREBASE_PROJECT_ID).',
      emailLabel: 'E-mail',
      emailPlaceholder: 'voce@exemplo.com',
      passwordLabel: 'Senha',
      passwordPlaceholder: 'Pelo menos 6 caracteres',
      signInButton: 'Entrar',
      signUpButton: 'Criar conta',
      resetPasswordButton: 'Enviar e-mail de redefinição',
      submitting: 'Aguarde...',
      requestInvitation: 'Não tem uma conta? Solicitar convite',
      switchToSignUp: 'Não tem uma conta? Cadastre-se',
      switchToSignIn: 'Já tem uma conta? Faça login',
      forgotPassword: 'Esqueceu sua senha?',
      backToSignIn: 'Voltar para o login',
      resetEmailSent: 'E-mail de redefinição de senha enviado.',
      showPassword: 'Mostrar senha',
      hidePassword: 'Ocultar senha',
      errors: {
        invalidCredential: 'E-mail ou senha incorretos.',
        emailInUse: 'Este endereço de e-mail já está em uso.',
        weakPassword: 'A senha deve ter pelo menos 6 caracteres.',
        invalidEmail: 'Digite um endereço de e-mail válido.',
        tooManyRequests: 'Muitas tentativas. Tente novamente mais tarde.',
        generic: 'Falha na autenticação. Tente novamente.',
      },
    },
  },

  it: {
    app: {
      pageTitle: 'Kakiokoshi - Lettore di trascrizioni',
    },
    navbar: {
      title: 'Lettore Cronologia Kakiokoshi',
      subtitle: 'Archivio trascrizioni degli ultimi 90 giorni',
      adminBadge: 'VISTA ADMIN',
      logout: 'Disconnetti',
      languageSelect: 'Seleziona Lingua',
    },
    sessionList: {
      title: 'Sessioni ({{count}})',
      refresh: 'Aggiorna',
      adminFilterPlaceholder: 'Filtra per ID utente (Admin)',
      searchPlaceholder: 'Cerca sessioni...',
      loading: 'Caricamento sessioni...',
      empty: 'Nessuna sessione trovata',
      segmentsCount: '{{count}} interventi',
      durationMinutes: '{{minutes}} min',
    },
    sessionDetail: {
      noSessionTitle: 'Nessuna sessione selezionata',
      noSessionDesc: 'Seleziona una sessione dall’elenco a sinistra per leggerla.',
      title: 'Dettagli sessione',
      languageLabel: 'Lingua: {{language}}',
      segmentsLabel: '{{count}} interventi',
      mutedVisible: 'Disattivati: Visibili',
      mutedHidden: 'Disattivati: Nascosti',
      exportTxt: 'Esporta TXT',
      loading: 'Caricamento trascrizioni...',
      empty: 'Nessun intervento in questa sessione',
      speaker: 'Interlocutore {{number}}',
      mutedTag: 'Disattivato dal vivo',
    },
    export: {
      sessionHeader: 'Sessione di trascrizione Kakiokoshi: {{id}}',
      dateHeader: 'Data: {{date}}',
      languageHeader: 'Lingua: {{language}}',
      userHeader: 'Utente: {{userId}}',
      speakerPrefix: 'Interlocutore {{number}}',
      mutedTag: '[DISATTIVATO]',
    },
    languageModal: {
      title: 'Impostazioni Lingua',
      subtitle: 'Seleziona la lingua di visualizzazione',
      close: 'Chiudi',
    },
    invitationModal: {
      title: 'Richiedi un invito di prova',
      subtitle: 'Kakiokoshi è attualmente disponibile solo su invito',
      description: 'Kakiokoshi è un servizio di trascrizione vocale in tempo reale ad alta precisione.\nPoiché l’elaborazione vocale continua con intelligenza artificiale comporta costi di infrastruttura, le registrazioni libere sono attualmente sospese, dando priorità di prova a persone ed enti con reali esigenze di accessibilità e supporto uditivo.',
      actionNote: 'Se desideri provare Kakiokoshi, ti invitiamo a inviarci un’e-mail descrivendo brevemente la tua situazione. Saremo lieti di contattarti per concordare un accesso di prova.',
      emailLabel: 'Indirizzo e-mail di contatto:',
      sendEmail: 'Invia e-mail di richiesta',
      copyEmail: 'Copia e-mail',
      copied: 'Copiato!',
      close: 'Chiudi',
      mailSubject: 'Richiesta di accesso di prova a Kakiokoshi',
      mailBody: 'Nome:\nUso previsto o esigenza di accessibilità (es.: conversazioni in famiglia, supporto all’udito):\nNote aggiuntive:',
    },
    auth: {
      loading: 'Caricamento sessione...',
      title: 'Lettore Cronologia Kakiokoshi',
      subtitle: 'Cronologia trascrizioni e visualizzatore amministratore',
      envError: 'Configurazione Firebase mancante in .env (VITE_FIREBASE_API_KEY / VITE_FIREBASE_PROJECT_ID).',
      emailLabel: 'Indirizzo Email',
      emailPlaceholder: 'nome@esempio.it',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Almeno 6 caratteri',
      signInButton: 'Accedi',
      signUpButton: 'Crea account',
      resetPasswordButton: 'Invia email di ripristino',
      submitting: 'Attendere...',
      requestInvitation: 'Non hai un account? Richiedi un invito',
      switchToSignUp: 'Non hai un account? Registrati',
      switchToSignIn: 'Hai già un account? Accedi',
      forgotPassword: 'Password dimenticata?',
      backToSignIn: 'Torna al login',
      resetEmailSent: 'Email per il ripristino della password inviata.',
      showPassword: 'Mostra password',
      hidePassword: 'Nascondi password',
      errors: {
        invalidCredential: 'Email o password non corretti.',
        emailInUse: 'Questo indirizzo email è già registrato.',
        weakPassword: 'La password deve contenere almeno 6 caratteri.',
        invalidEmail: 'Inserisci un indirizzo email valido.',
        tooManyRequests: 'Troppi tentativi. Riprova più tardi.',
        generic: 'Errore di autenticazione. Riprova.',
      },
    },
  },

  ca: {
    app: {
      pageTitle: 'Kakiokoshi - Lector de transcripcions',
    },
    navbar: {
      title: "Lector d'Historial Kakiokoshi",
      subtitle: 'Arxiu de transcripcions dels darrers 90 dies',
      adminBadge: 'VISTA ADMIN',
      logout: 'Tanca la sessió',
      languageSelect: "Tria l'idioma",
    },
    sessionList: {
      title: 'Sessions ({{count}})',
      refresh: 'Actualitza',
      adminFilterPlaceholder: "Filtra per ID d'usuari (Admin)",
      searchPlaceholder: 'Cerca sessions...',
      loading: 'Carregant sessions...',
      empty: "No s'han trobat sessions",
      segmentsCount: '{{count}} intervencions',
      durationMinutes: '{{minutes}} min',
    },
    sessionDetail: {
      noSessionTitle: 'Cap sessió seleccionada',
      noSessionDesc: "Tria una sessió de la llista de l'esquerra per consultar-la.",
      title: 'Detalls de la sessió',
      languageLabel: 'Idioma: {{language}}',
      segmentsLabel: '{{count}} intervencions',
      mutedVisible: 'Silenciats: Visibles',
      mutedHidden: 'Silenciats: Amagats',
      exportTxt: 'Exporta a TXT',
      loading: 'Carregant transcripcions...',
      empty: 'No hi ha cap intervenció en aquesta sessió',
      speaker: 'Interlocutor {{number}}',
      mutedTag: 'Silenciat en viu',
    },
    export: {
      sessionHeader: 'Sessió de transcripció Kakiokoshi: {{id}}',
      dateHeader: 'Data: {{date}}',
      languageHeader: 'Idioma: {{language}}',
      userHeader: 'Usuari: {{userId}}',
      speakerPrefix: 'Interlocutor {{number}}',
      mutedTag: '[SILENCIAT]',
    },
    languageModal: {
      title: "Configuració d'idioma",
      subtitle: "Tria l'idioma de visualització",
      close: 'Tanca',
    },
    invitationModal: {
      title: "Sol·licitud d'invitació de prova",
      subtitle: 'Kakiokoshi funciona actualment només per invitació',
      description: "Kakiokoshi és un servei de transcripció de veu en temps real d'alta precisió.\nCom que el processament d'àudio continu amb IA genera costos d'infraestructura, el registre obert està aturat per donar prioritat de prova a persones i entitats amb necessitats reals d'accessibilitat o suport auditiu.",
      actionNote: "Si vols provar Kakiokoshi, envia'ns un correu electrònic explicant breument la teva situació o necessitat. Ens posarem en contacte amb tu de bon grat per facilitar-te un accés de prova.",
      emailLabel: 'Correu electrònic de contacte:',
      sendEmail: 'Envia correu de sol·licitud',
      copyEmail: 'Copia el correu',
      copied: 'Copiat!',
      close: 'Tanca',
      mailSubject: "Sol·licitud d'accés de prova a Kakiokoshi",
      mailBody: 'Nom:\nÚs previst o necessitat d’accessibilitat (ex.: converses familiars, suport auditiu):\nMissatge addicional:',
    },
    auth: {
      loading: 'Carregant la sessió...',
      title: "Lector d'Historial Kakiokoshi",
      subtitle: "Historial de transcripcions i lector d'administració",
      envError: "Falta la configuració de Firebase a l'arxiu .env (VITE_FIREBASE_API_KEY / VITE_FIREBASE_PROJECT_ID).",
      emailLabel: 'Correu electrònic',
      emailPlaceholder: 'tu@exemple.cat',
      passwordLabel: 'Contrasenya',
      passwordPlaceholder: 'Mínim 6 caràcters',
      signInButton: 'Inicia la sessió',
      signUpButton: 'Crea un compte',
      resetPasswordButton: 'Envia correu de recuperació',
      submitting: 'Processant...',
      requestInvitation: 'No tens compte? Sol·licita una invitació',
      switchToSignUp: 'No tens compte? Registra’t',
      switchToSignIn: 'Ja tens compte? Inicia la sessió',
      forgotPassword: 'Has oblidat la contrasenya?',
      backToSignIn: 'Torna a l’inici de sessió',
      resetEmailSent: "S'ha enviat un correu per restablir la contrasenya.",
      showPassword: 'Mostra la contrasenya',
      hidePassword: 'Amaga la contrasenya',
      errors: {
        invalidCredential: 'El correu electrònic o la contrasenya són incorrectes.',
        emailInUse: 'Aquest correu electrònic ja està registrat.',
        weakPassword: 'La contrasenya ha de tenir almenys 6 caràcters.',
        invalidEmail: 'Introdueix un correu electrònic vàlid.',
        tooManyRequests: 'Massa intents. Torna-ho a provar més tard.',
        generic: "Error d'autenticació. Torna-ho a provar.",
      },
    },
  },

  ar: {
    app: {
      pageTitle: 'كاكيوكوشي - قارئ النسخ',
    },
    navbar: {
      title: 'قارئ سجل كاكيوكوشي',
      subtitle: 'أرشيف النسخ الصوتي لآخر 90 يوماً',
      adminBadge: 'عرض المشرف',
      logout: 'تسجيل الخروج',
      languageSelect: 'اختيار اللغة',
    },
    sessionList: {
      title: 'الجلسات ({{count}})',
      refresh: 'تحديث',
      adminFilterPlaceholder: 'تصفية حسب معرف المستخدم (Admin)',
      searchPlaceholder: 'البحث في الجلسات...',
      loading: 'جارٍ تحميل الجلسات...',
      empty: 'لم يتم العثور على جلسات',
      segmentsCount: '{{count}} مقطع',
      durationMinutes: '{{minutes}} دقيقة',
    },
    sessionDetail: {
      noSessionTitle: 'لم يتم اختيار جلسة',
      noSessionDesc: 'يرجى اختيار جلسة من القائمة لعرض نصوصها.',
      title: 'تفاصيل الجلسة',
      languageLabel: 'اللغة: {{language}}',
      segmentsLabel: '{{count}} مقطع',
      mutedVisible: 'المقاطع المخفية: معروضة',
      mutedHidden: 'المقاطع المخفية: مخفية',
      exportTxt: 'تصدير كملف نصي',
      loading: 'جارٍ تحميل نصوص الجلسة...',
      empty: 'لا توجد نصوص مسجلة في هذه الجلسة',
      speaker: 'المتحدث {{number}}',
      mutedTag: 'تم إخفاؤه في البث المباشر',
    },
    export: {
      sessionHeader: 'جلسة نسخ كاكيوكوشي: {{id}}',
      dateHeader: 'التاريخ: {{date}}',
      languageHeader: 'اللغة: {{language}}',
      userHeader: 'المستخدم: {{userId}}',
      speakerPrefix: 'المتحدث {{number}}',
      mutedTag: '[مكتوم]',
    },
    languageModal: {
      title: 'إعدادات اللغة',
      subtitle: 'اختر لغة العرض',
      close: 'إغلاق',
    },
    invitationModal: {
      title: 'طلب دعوة لتجربة الخدمة',
      subtitle: 'كاكيوكوشي متاح حالياً بنظام الدعوات الخاصة',
      description: 'كاكيوكوشي هو تطبيق متخصص للنسخ الصوتي الفوري بدقة عالية.\nنظراً لأن معالجة الصوت المباشرة بالذكاء الاصطناعي تتطلب تكاليف تشغيلية مستمرة، فقد تم إيقاف التسجيل المفتوح مؤقتاً لتخصيص فترات تجريبية لمن لديهم حاجة حقيقية لدعم السمع وتيسير التواصل اليومي.',
      actionNote: 'إذا كنت ترغب في تجربة كاكيوكوشي، يُرجى إرسال بريد إلكتروني يوضح باختصار حاجتك أو كيفية استفادتك من التطبيق، وسنتواصل معك لترتيب حساب تجريبي.',
      emailLabel: 'البريد الإلكتروني للتواصل:',
      sendEmail: 'إرسال بريد لطلب التجربة',
      copyEmail: 'نسخ البريد الإلكتروني',
      copied: 'تم النسخ!',
      close: 'إغلاق',
      mailSubject: 'طلب تجربة تطبيق كاكيوكوشي (Kakiokoshi)',
      mailBody: 'الاسم:\nالغرض من الاستخدام أو الحاجة لتسهيل التواصل (مثل: محادثات عائلية، دعم السمع):\nملاحظات إضافية:',
    },
    auth: {
      loading: 'جارٍ التحميل...',
      title: 'قارئ سجل كاكيوكوشي',
      subtitle: 'أرشيف النسخ الصوتي وعرض الإدارة',
      envError: 'إعدادات Firebase مفقودة في ملف .env (VITE_FIREBASE_API_KEY / VITE_FIREBASE_PROJECT_ID).',
      emailLabel: 'البريد الإلكتروني',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'كلمة المرور',
      passwordPlaceholder: '6 أحرف على الأقل',
      signInButton: 'تسجيل الدخول',
      signUpButton: 'إنشاء حساب',
      resetPasswordButton: 'إرسال رابط إعادة التعيين',
      submitting: 'يرجى الانتظار...',
      requestInvitation: 'ليس لديك حساب؟ طلب دعوة تجريبية',
      switchToSignUp: 'ليس لديك حساب؟ أنشئ حساباً جديداً',
      switchToSignIn: 'لديك حساب بالفعل؟ تسجيل الدخول',
      forgotPassword: 'هل نسيت كلمة المرور؟',
      backToSignIn: 'العودة لتسجيل الدخول',
      resetEmailSent: 'تم إرسال بريد إعادة تعيين كلمة المرور.',
      showPassword: 'إظهار كلمة المرور',
      hidePassword: 'إخفاء كلمة المرور',
      errors: {
        invalidCredential: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
        emailInUse: 'هذا البريد الإلكتروني مستخدم بالفعل.',
        weakPassword: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.',
        invalidEmail: 'يرجى إدخال بريد إلكتروني صالح.',
        tooManyRequests: 'محاولات كثيرة جداً. يرجى المحاولة لاحقاً.',
        generic: 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.',
      },
    },
  },

  he: {
    app: {
      pageTitle: 'קאקיוקושי - קורא תמלולים',
    },
    navbar: {
      title: 'קורא היסטוריה קאקיוקושי',
      subtitle: 'ארכיון תמלולים ל-90 הימים האחרונים',
      adminBadge: 'תצוגת מנהל',
      logout: 'התנתק',
      languageSelect: 'בחירת שפה',
    },
    sessionList: {
      title: 'הפעלות ({{count}})',
      refresh: 'רענן',
      adminFilterPlaceholder: 'סנן לפי מזהה משתמש (Admin)',
      searchPlaceholder: 'חיפוש הפעלות...',
      loading: 'טוען הפעלות...',
      empty: 'לא נמצאו הפעלות',
      segmentsCount: '{{count}} מקטעים',
      durationMinutes: '{{minutes}} דק׳',
    },
    sessionDetail: {
      noSessionTitle: 'לא נבחרה הפעלה',
      noSessionDesc: 'בחר הפעלת תמלול מהרשימה כדי לקרוא את התוכן.',
      title: 'פרטי הפעלה',
      languageLabel: 'שפה: {{language}}',
      segmentsLabel: '{{count}} מקטעים',
      mutedVisible: 'מושתקים: מוצגים',
      mutedHidden: 'מושתקים: מוסתרים',
      exportTxt: 'ייצוא TXT',
      loading: 'טוען תמלילים...',
      empty: 'אין קטעי דיבור בהפעלה זו',
      speaker: 'דובר {{number}}',
      mutedTag: 'הושתק בזמן אמת',
    },
    export: {
      sessionHeader: 'תמלול קאקיוקושי הפעלה: {{id}}',
      dateHeader: 'תאריך: {{date}}',
      languageHeader: 'שפה: {{language}}',
      userHeader: 'משתמש: {{userId}}',
      speakerPrefix: 'דובר {{number}}',
      mutedTag: '[מושתק]',
    },
    languageModal: {
      title: 'הגדרות שפה',
      subtitle: 'בחר שפת תצוגה',
      close: 'סגור',
    },
    invitationModal: {
      title: 'בקשת הזמנה לגישת ניסיון',
      subtitle: 'הגישה לקאקיוקושי מוגבלת כעת להזמנות אישיות',
      description: 'קאקיוקושי הוא שירות תמלול קולי מדויק בזמן אמת.\nמאחר שעיבוד שמע חי בבינה מלאכותית דורש משאבי ענן בעלי עלות שוטפת, ההרשמה הפתוחה הוקפאה באופן זמני, ואנו מעניקים גישות ניסיון בתיאום אישי עבור מי שזקוקים לכך לסיוע בשמיעה ובנגישות.',
      actionNote: 'אם ברצונך להתנסות בקאקיוקושי, אנא שלח/י לנו הודעת דוא"ל קצרה עם תיאור הצורך או המצב. נשמח לחזור אליך בהקדם כדי להסדיר עבורך גישת ניסיון.',
      emailLabel: 'כתובת דוא"ל ליצירת קשר:',
      sendEmail: 'שלח אימייל לבקשת גישה',
      copyEmail: 'העתק כתובת אימייל',
      copied: 'הועתק!',
      close: 'סגור',
      mailSubject: 'בקשת גישת ניסיון לקאקיוקושי',
      mailBody: 'שם:\nמטרת השימוש או צורך הנגישות (לדוגמה: שיחות משפחתיות, כבדות שמיעה):\nהערות נוספות:',
    },
    auth: {
      loading: 'טוען הפעלה...',
      title: 'קורא היסטוריה קאקיוקושי',
      subtitle: 'היסטוריית תמלולים וממשק מנהל',
      envError: 'הגדרות Firebase חסרות בקובץ .env (VITE_FIREBASE_API_KEY / VITE_FIREBASE_PROJECT_ID).',
      emailLabel: 'כתובת אימייל',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'סיסמה',
      passwordPlaceholder: 'לפחות 6 תווים',
      signInButton: 'התחבר',
      signUpButton: 'צור חשבון',
      resetPasswordButton: 'שלח אימייל לאיפוס סיסמה',
      submitting: 'נא להמתין...',
      requestInvitation: 'אין לך חשבון? בקש הזמנת ניסיון',
      switchToSignUp: 'אין לך חשבון? הרשם כאן',
      switchToSignIn: 'כבר יש לך חשבון? התחבר',
      forgotPassword: 'שכחת סיסמה?',
      backToSignIn: 'חזרה להתחברות',
      resetEmailSent: 'נשלח אימייל לאיפוס הסיסמה. בדוק את תיבת הדואר שלך.',
      showPassword: 'הצג סיסמה',
      hidePassword: 'הסתר סיסמה',
      errors: {
        invalidCredential: 'אימייל או סיסמה שגויים.',
        emailInUse: 'כתובת האימייל הזו כבר בשימוש.',
        weakPassword: 'הסיסמה חייבת להכיל לפחות 6 תווים.',
        invalidEmail: 'נא להזין כתובת אימייל תקינה.',
        tooManyRequests: 'יותר מדי ניסיונות. נסה שוב מאוחר יותר.',
        generic: 'האימות נכשל. נסה שוב.',
      },
    },
  },
};
