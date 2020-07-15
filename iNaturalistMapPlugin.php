<?php
   /*
   Plugin Name: iNaturalist Map
   description: Zeigt die iNaturalist Karte von Bern an.
   Version: 0.1
   Author: Nic Dorner
   */
   
function add_settings_page() {
    add_options_page( 'iNaturalist Map Settings', 'iNaturalist Map Settings', 'manage_options', ‘inaturalist_settings’, 'render_plugin_settings_page' );
}
add_action( 'admin_menu', 'add_settings_page' );

function render_plugin_settings_page() {
    ?>
    <h2>Settings for iNaturalist Map Plugin</h2>
    <form action="options.php" method="post">
        <?php 
        settings_fields( 'inaturalist_plugin_options' );
        do_settings_sections( 'inaturalist_plugin_settings' ); ?>
        <input name="submit" class="button button-primary" type="submit" value="<?php esc_attr_e( 'Save' ); ?>" />
    </form>
    <?php
}

function register_settings() {
    register_setting( 'inaturalist_plugin_options', 'inaturalist_plugin_options', 'inaturalist_plugin_options_validate' );
    add_settings_section( 'api_settings', 'API Settings', 'inaturalist_section_text', 'inaturalist_plugin_settings' );

    add_settings_field( 'inaturalist_plugin_setting_api_key', 'API Key', 'inaturalist_plugin_setting_api_key', 'inaturalist_plugin_settings', 'api_settings' );
}
add_action( 'admin_init', 'register_settings' );

function inaturalist_plugin_options_validate( $input ) {
    $newinput['api_key'] = trim( $input['api_key'] );
    if ( ! preg_match( '/^[a-zA-Z0-9\-_]*$/i', $newinput['api_key'] ) ) {
        $newinput['api_key'] = '';
    }

    return $newinput;
}

function inaturalist_section_text() {
    echo '<p>Here you can set all the options for using the API</p>';
}

function inaturalist_plugin_setting_api_key() {
    $options = get_option( 'inaturalist_plugin_options' );
    echo "<input id='inaturalist_plugin_options' name='inaturalist_plugin_options[api_key]' type='text' value='" . $options['api_key'] . "' />";
}
   
function load_scripts(){
	// wp_register_style( 'style', plugin_dir_url( __FILE__ ) . 'google_maps.css' );
    // wp_enqueue_style( 'style' );
	
	wp_enqueue_script( 'maps', 'https://maps.googleapis.com/maps/api/js?key=' . get_option('inaturalist_plugin_options')[api_key], array( 'jquery' ) );
	wp_enqueue_script( 'wax.g', plugin_dir_url( __FILE__ ) . 'wax.g.js', array( 'jquery' ) );
	wp_enqueue_script( 'iNaturalist', plugin_dir_url( __FILE__ ) . 'iNaturalist.js', array( 'jquery', 'lodash' ) );
	wp_enqueue_script( 'taxonmap', plugin_dir_url( __FILE__ ) . 'taxonmap.js', array( 'jquery', 'lodash' ) );
}
add_action( 'wp_enqueue_scripts', 'load_scripts' );

// The widget class
class Map_Widget extends WP_Widget {

	// Main constructor
	public function __construct() {
		parent::__construct(
			'map_widget', 'iNaturalist Map Widget'
		);
	}

	// The widget form (for the backend )
	public function form( $instance ) {	
		/* ... */
	}

	// Update widget settings
	public function update( $new_instance, $old_instance ) {
		/* ... */
	}

	// Display the widget
	public function widget( $args, $instance ) {
		echo $before_widget;
		
		readfile(plugin_dir_url( __FILE__ ) . 'map.html');
		
		echo $after_widget;
	}

}

// Register the widget
function register_map_widget() {
	register_widget( 'Map_Widget' );
}
add_action( 'widgets_init', 'register_map_widget' );
?>