pkg-windows:
	IF exist dist (	rmdir /s/q dist && echo dist removed )
	IF exist cdk.out ( rmdir /s/q cdk.out && echo cdk.out removed )
	npm run build
	copy package.json dist
	copy package-lock.json dist
	copy Makefile dist
	cd dist && npm install --only=production

pkg-linux:
	rm -r dist || true
	rm -r cdk.out || true
	mkdir dist
	./node_modules/.bin/tsc
	cp package.json dist
	cp package-lock.json dist
	cp Makefile dist
	cd dist && npm install --only=production