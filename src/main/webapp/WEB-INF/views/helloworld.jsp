<%@ page language="java" contentType="text/html; charset=ISO-8859-1"
	pageEncoding="ISO-8859-1"%>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<script type="text/javascript" src="https://sdk.clarifai.com/js/clarifai-latest.js"></script>

<meta http-equiv="Content-Type" content="text/html; charset=ISO-8859-1">
<title>Spring 4 MVC -HelloWorld</title>
</head>
<body>
	<center>
		<h2>Machine learning video</h2>
	</center>

	<script>

		const app = new Clarifai.App({
			apiKey : 'c6a364f4a66146089437c6405f36d1d9'
		});
		app.models.predict(Clarifai.GENERAL_MODEL, "https://pbs.twimg.com/profile_images/782474226020200448/zDo-gAo0_400x400.jpg").then(
				function(response) {
					console.log(response);
					console.log(response.outputs[0].data.concepts[0].name);
					console.log(response.outputs[0].data.concepts[1].name);
					console.log(response.outputs[0].data.concepts[2].name);
					
					
				}, function(err) {
					console.log("somethink went wrong");
				});
	</script>
	
	<form method="POST" action="uploadFile" enctype="multipart/form-data">
		File to upload: <input type="file" name="file">
 
		Name: <input type="text" name="name">
 
 
		<input type="submit" value="Upload"> Press here to upload the file!
	</form>
	
	<script>
clarifai.models.predict(Clarifai.GENERAL_MODEL, {base64: 'AAAAIGZ...'}, {video: true})
  .then(
  function(response) {
    // do something with response
  },
  function(err) {
    // there was an error
  }
);
	</script>
	
</body>
</html>