[1]: https://www.dropbox.com/sh/agx15xqa4kw8kwb/AAAELJxQZjbPbZTgWzb74xiza?dl=0

# GreengrassCore
Greengrass core images and examples for WAGO TP600 and PFC200 G2 controllers

[Find the image file here][1]

To use this:

1. Build the Group and Core by following the setup steps in the AWS IoT Core >> Greengrass >> Groups
![Image of GGC creation](./images/image1.png)

2. Use "Easy Creation" to build the development package and credentials
![Easy Creation](./images/image3.png)

3. Download the tar.gz file that includes the credentials and config file
![Download package](./images/image4.png)

4. Copy the <certificate>.tar.gz file to the controllers / directory.  Extract and distribute to /greengrass
    
    `tar -xzvf <identifier>.tar.gz -C /greengrass`

5. reboot the controller and the greengrass service will start automatically

	`sudo reboot`
