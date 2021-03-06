<?php

//require the wordpress codex
require( '../wp-load.php' );
require('./featured-image.php');

$urls = array(
array("url"=>"http://api.brightcove.com/services/library?command=search_videos&all=segment:AUnationalninenews&page_size=12&page_number=0&sort_by=START_DATE:DESC&token=Vb3fqavTKFDDZbnnGGtbhKxam7uHduOnob-2MJlpHmUnzSMWbDe5bg..&video_fields=id,referenceId,version,name,shortDescription,publishedDate,startDate,endDate,length,itemState,thumbnailURL,videoStillURL,playsTotal&custom_fields=genre,network,provider,series,season,episode,originalairdate,classification&get_item_count=true&callback=_","type"=>"news") //NEWS
);

foreach ($urls as $url) {
	updatenews($url["url"],$url["type"]);
}

function updatenews($url,$type) {
	//look for the category by slug	
	$idObj = get_category_by_slug('nine');
	
	// Get the json from the URL
	$jsonp = file_get_contents($url);
	// Remove the container function to create json
	$json = substr(trim($jsonp),2,-2);
	// Parse the json
	$data = json_decode($json);
	
	// look for the results withint the json
	$results = $data->items;
	foreach (array_reverse($results) as $result) {

		$title = $result->name;
		$content = '<p><a href="http://video.news.ninemsn.com.au/?videoid='.$result->id.'"><img src="'.$result->thumbnailURL.'"/></a></p>';
		$src = $result->thumbnailURL;
		$content .= '<p>'.$result->shortDescription.'</p>';
		$content .= '<h2><a href="http://video.news.ninemsn.com.au/?videoid='.$result->id.'">view</a></h2>';
		
		// Create post object from json
		$my_post = array(
		  'post_title'    => $title,
		  'post_content'  => $content,
		  'post_name'     => sanitize_title($title),
		  'post_status'   => 'publish',
		  'post_author'   => 1,
		  'post_category' => array($idObj->term_id),
		  'tags_input'	  => $type
		);
		
		// Create lookup params to see if the post exists
		$args = array(
		  'name' => sanitize_title($title),
		  'post_type' => 'post',
		  'post_status' => 'any',
		  'numberposts' => 1
		);
		
		$my_posts = get_posts($args);
		
		// If we find a post with this slug, don't create it
		if( $my_posts ) {
			//log('ID on the first post found '.$my_posts[0]->ID);
		} else {
			// Else, insert the post into the database
			$postid = wp_insert_post($my_post);
			featured_image($postid,$src);
		}
	}

}

?>