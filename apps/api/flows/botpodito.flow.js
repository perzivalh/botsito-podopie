/**
 * Flow: Botpodito (Podopie)
 * Flujograma base con menus y derivacion a atencion personalizada
 */
module.exports = {
  id: "botpodito",
  name: "Botpodito",
  description: "Flujograma Podopie con menus, servicios y paquetes.",
  version: "1.0.0",
  icon: "🦶",
  category: "salud",

  start_node_id: "WELCOME",

  nodes: [
    {
      id: "WELCOME",
      type: "text",
      text: "PRIMER MENSAJE DE BIENVENIDA",
      next: "MAIN_MENU",
    },
    {
      id: "MAIN_MENU",
      type: "text",
      text: "MENU Y ETIQUETA DEL MES ACTUAL",
      buttons: [
        { label: "HORARIOS DE ATENCIÓN Y UBICACION", next: "HORARIOS_INFO" },
        { label: "PRECIOS", next: "PRECIOS_INFO" },
        { label: "SERVICIOS", next: "SERVICIOS_SELECT" },
        { label: "OTROS", next: "OTROS_SELECT" },
        { label: "PODOPAQUETES", next: "PODOPAQUETES_ROOT" },
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
      ],
    },

    {
      id: "HORARIOS_INFO",
      type: "text",
      text: "INFORMACIÓN DE HORARIOS Y UBICACIÓN DE LA CENTRAL Y SUCURSAL",
      buttons: [
        { label: "VOLVER AL MENU", next: "MAIN_MENU" },
        { label: "FINALIZAR", next: "CIERRE_PRECIOS_SERVICIOS" },
      ],
    },

    {
      id: "PRECIOS_INFO",
      type: "text",
      text: "ENVIAR INFORMACIÓN DE PRECIOS GENERAL\nPREGUNTAR SI REQUIERE UN SERVICIO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "NO", next: "PRECIOS_MAS" },
        { label: "SI", next: "SERVICIOS_SELECT" },
      ],
    },
    {
      id: "PRECIOS_MAS",
      type: "text",
      text: "SI REQUIERE ALGO MÁS DARLE OPCIÓN DEL VOLVER AL MENU O FINALIZAR",
      buttons: [
        { label: "VOLVER AL MENU", next: "MAIN_MENU" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },

    {
      id: "SERVICIOS_SELECT",
      type: "text",
      text: "SELECCIONA EL SERVICIO QUE NECESITES",
      buttons: [
        { label: "UÑERO", next: "UNERO_TIPO_TRAT" },
        { label: "HONGOS", next: "HONGOS_TIPO_TRAT" },
        { label: "PEDICURE", next: "PEDICURE_INFO" },
        { label: "PODOPEDIATRIA", next: "PODOPEDIATRIA_INFO" },
        { label: "PODOGERIATRIA", next: "PODOGERIATRIA_INFO" },
      ],
    },

    {
      id: "UNERO_TIPO_TRAT",
      type: "text",
      text: "INFORMACIÓN DEL SERVICIO\nTIPO DE TRATAMIENTO",
      buttons: [
        { label: "MATRICECTOMIA", next: "MATRICECTOMIA_TRAT" },
        { label: "ORTESIS", next: "ORTESIS_TRAT" },
      ],
    },
    {
      id: "HONGOS_TIPO_TRAT",
      type: "text",
      text: "INFORMACIÓN DEL SERVICIO\nTIPO DE TRATAMIENTO",
      buttons: [
        { label: "LASER", next: "HONGOS_LASER_TRAT" },
        { label: "TOPICO", next: "HONGOS_TOPICO_TRAT" },
        { label: "SISTEMICO", next: "HONGOS_SISTEMICO_TRAT" },
      ],
    },

    {
      id: "MATRICECTOMIA_TRAT",
      type: "text",
      text: "INFORMACIÓN DEL TRATAMIENTO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "volver al menu", next: "MAIN_MENU" },
        { label: "volver al menu de servicios", next: "SERVICIOS_SELECT" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },
    {
      id: "ORTESIS_TRAT",
      type: "text",
      text: "INFORMACIÓN DEL TRATAMIENTO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "volver al menu", next: "MAIN_MENU" },
        { label: "volver al menu de servicios", next: "SERVICIOS_SELECT" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },
    {
      id: "HONGOS_LASER_TRAT",
      type: "text",
      text: "INFORMACIÓN DEL TRATAMIENTO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "volver al menu", next: "MAIN_MENU" },
        { label: "volver al menu de servicios", next: "SERVICIOS_SELECT" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },
    {
      id: "HONGOS_TOPICO_TRAT",
      type: "text",
      text: "INFORMACIÓN DEL TRATAMIENTO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "volver al menu", next: "MAIN_MENU" },
        { label: "volver al menu de servicios", next: "SERVICIOS_SELECT" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },
    {
      id: "HONGOS_SISTEMICO_TRAT",
      type: "text",
      text: "INFORMACIÓN DEL TRATAMIENTO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "volver al menu", next: "MAIN_MENU" },
        { label: "volver al menu de servicios", next: "SERVICIOS_SELECT" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },

    {
      id: "PEDICURE_INFO",
      type: "text",
      text: "INFORMACIÓN DEL SERVICIO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "volver al menu", next: "MAIN_MENU" },
        { label: "volver al menu de servicios", next: "SERVICIOS_SELECT" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },
    {
      id: "PODOPEDIATRIA_INFO",
      type: "text",
      text: "INFORMACIÓN DEL SERVICIO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "volver al menu", next: "MAIN_MENU" },
        { label: "volver al menu de servicios", next: "SERVICIOS_SELECT" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },
    {
      id: "PODOGERIATRIA_INFO",
      type: "text",
      text: "INFORMACIÓN DEL SERVICIO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "volver al menu", next: "MAIN_MENU" },
        { label: "volver al menu de servicios", next: "SERVICIOS_SELECT" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },

    {
      id: "OTROS_SELECT",
      type: "text",
      text: "SELECCIONA EL SERVICIO QUE NECESITES",
      buttons: [
        { label: "CALLOSIDAD", next: "CALLOSIDAD_INFO" },
        { label: "VERRUGA PLANTAR", next: "VERRUGA_PLANTAR_INFO" },
        { label: "HELOMA", next: "HELOMA_INFO" },
        { label: "EXTRACCION DE UÑA", next: "EXTRACCION_UNA_INFO" },
        { label: "PIE DE ATLETA", next: "PIE_ATLETA_INFO" },
        { label: "PIE DIABETICO", next: "PIE_DIABETICO_INFO" },
      ],
    },

    {
      id: "CALLOSIDAD_INFO",
      type: "text",
      text: "INFORMACIÓN DEL SERVICIO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "volver al menu", next: "MAIN_MENU" },
        { label: "volver al menu de servicios", next: "OTROS_SELECT" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },
    {
      id: "VERRUGA_PLANTAR_INFO",
      type: "text",
      text: "INFORMACIÓN DEL SERVICIO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "volver al menu", next: "MAIN_MENU" },
        { label: "volver al menu de servicios", next: "OTROS_SELECT" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },
    {
      id: "HELOMA_INFO",
      type: "text",
      text: "INFORMACIÓN DEL SERVICIO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "volver al menu", next: "MAIN_MENU" },
        { label: "volver al menu de servicios", next: "OTROS_SELECT" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },
    {
      id: "EXTRACCION_UNA_INFO",
      type: "text",
      text: "INFORMACIÓN DEL SERVICIO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "volver al menu", next: "MAIN_MENU" },
        { label: "volver al menu de servicios", next: "OTROS_SELECT" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },
    {
      id: "PIE_ATLETA_INFO",
      type: "text",
      text: "INFORMACIÓN DEL SERVICIO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "volver al menu", next: "MAIN_MENU" },
        { label: "volver al menu de servicios", next: "OTROS_SELECT" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },
    {
      id: "PIE_DIABETICO_INFO",
      type: "text",
      text: "INFORMACIÓN DEL SERVICIO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "volver al menu", next: "MAIN_MENU" },
        { label: "volver al menu de servicios", next: "OTROS_SELECT" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },

    {
      id: "PODOPAQUETES_ROOT",
      type: "text",
      text: "PODOPAQUETES",
      buttons: [
        { label: "PODOMIX", next: "PKG_PODOMIX_INFO" },
        { label: "PODOCALLOS", next: "PKG_PODOCALLOS_INFO" },
        { label: "PODOPLUS", next: "PKG_PODOPLUS_INFO" },
        { label: "NOMASHONGOS", next: "PKG_NOMASHONGOS_INFO" },
        { label: "PODOFRIO", next: "PKG_PODOFRIO_INFO" },
        { label: "PODODIABETIK", next: "PKG_PODODIABETIK_INFO" },
        { label: "PIESANOS", next: "PKG_PIESANOS_INFO" },
        { label: "PODOLAB", next: "PKG_PODOLAB_INFO" },
        { label: "PODOPROTEX", next: "PKG_PODOPROTEX_INFO" },
      ],
    },

    {
      id: "PKG_PODOMIX_INFO",
      type: "text",
      text: "INFORMACIÓN DEL SERVICIO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "volver al menu", next: "MAIN_MENU" },
        { label: "volver al menu de servicios", next: "PODOPAQUETES_ROOT" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },
    {
      id: "PKG_PODOCALLOS_INFO",
      type: "text",
      text: "INFORMACIÓN DEL SERVICIO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "volver al menu", next: "MAIN_MENU" },
        { label: "volver al menu de servicios", next: "PODOPAQUETES_ROOT" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },
    {
      id: "PKG_PODOPLUS_INFO",
      type: "text",
      text: "INFORMACIÓN DEL SERVICIO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "volver al menu", next: "MAIN_MENU" },
        { label: "volver al menu de servicios", next: "PODOPAQUETES_ROOT" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },
    {
      id: "PKG_NOMASHONGOS_INFO",
      type: "text",
      text: "INFORMACIÓN DEL SERVICIO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "volver al menu", next: "MAIN_MENU" },
        { label: "volver al menu de servicios", next: "PODOPAQUETES_ROOT" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },
    {
      id: "PKG_PODOFRIO_INFO",
      type: "text",
      text: "INFORMACIÓN DEL SERVICIO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "volver al menu", next: "MAIN_MENU" },
        { label: "volver al menu de servicios", next: "PODOPAQUETES_ROOT" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },
    {
      id: "PKG_PODODIABETIK_INFO",
      type: "text",
      text: "INFORMACIÓN DEL SERVICIO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "volver al menu", next: "MAIN_MENU" },
        { label: "volver al menu de servicios", next: "PODOPAQUETES_ROOT" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },
    {
      id: "PKG_PIESANOS_INFO",
      type: "text",
      text: "INFORMACIÓN DEL SERVICIO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "volver al menu", next: "MAIN_MENU" },
        { label: "volver al menu de servicios", next: "PODOPAQUETES_ROOT" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },
    {
      id: "PKG_PODOLAB_INFO",
      type: "text",
      text: "INFORMACIÓN DEL SERVICIO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "volver al menu", next: "MAIN_MENU" },
        { label: "volver al menu de servicios", next: "PODOPAQUETES_ROOT" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },
    {
      id: "PKG_PODOPROTEX_INFO",
      type: "text",
      text: "INFORMACIÓN DEL SERVICIO",
      buttons: [
        { label: "ATENCIÓN PERSONALIZADA", next: "HUMAN_SUPPORT" },
        { label: "volver al menu", next: "MAIN_MENU" },
        { label: "volver al menu de servicios", next: "PODOPAQUETES_ROOT" },
        { label: "FINALIZAR", next: "CIERRE_HORARIO_UBICACION" },
      ],
    },

    {
      id: "HUMAN_SUPPORT",
      type: "action",
      action: "ATENCION_PERSONALIZADA",
      terminal: true,
    },
    {
      id: "CIERRE_PRECIOS_SERVICIOS",
      type: "text",
      text: "MENSAJE DE CIERRE\nPRECIOS\nY SERVICIOS",
      terminal: true,
    },
    {
      id: "CIERRE_HORARIO_UBICACION",
      type: "text",
      text: "MENSAJE DE CIERRE\nhorario\nubicacion",
      terminal: true,
    },
  ],

  useLegacyHandler: false,
};
